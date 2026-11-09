"""Grounded retention recommendations: eligible offers, expected value, and a Groq-written plan.

This module never touches the Flask app directly (no import of api/app.py), to keep the import
graph one-directional (api/app.py imports this module, not the other way around). Everything it
needs (the pipeline, the encode function, the override function, the offer catalog, the business
cost config) is passed in by the caller.
"""
import json
import os
import re
from typing import Optional

from groq import Groq
from pydantic import BaseModel, ValidationError

GROQ_MODEL = "openai/gpt-oss-20b"
GROQ_TIMEOUT_SECONDS = 10
GROQ_TEMPERATURE = 0.4
GROQ_MAX_TOKENS = 700
GROQ_MAX_ATTEMPTS = 2

TOP_DRIVER_CONTEXT_COUNT = 5
EM_DASH = chr(0x2014)

# Output the model was told never to write in the customer-facing email
FORBIDDEN_EMAIL_TEXT = re.compile(r"\b(?:churn\w*|probabilit\w*|scores?|risks?)\b|\[[^\]]+\]", re.IGNORECASE)
FIGURE = re.compile(r"\d+(?:\.\d+)?")

RETENTION_SYSTEM_PROMPT = """You are a retention strategist for a telecom company.

You are given verified data about one customer and a list of retention offers they are
eligible for, each with a real cost and, where it could be simulated, a model-estimated
expected value. Use only this data. Never invent customer details, offers, discounts, prices,
or financial figures that are not in the data you were given.

Rules:
- recommended_offer_id must be exactly one of the offer ids provided. Never invent a new id.
- summary, main_drivers and strategy are internal notes: you may discuss churn, probability,
  and risk plainly there.
- email_subject and email_body are customer-facing. Never use the words churn, probability,
  risk or score there, and never use a placeholder such as [Name]. Greet the customer with
  "Hi there".
- Do not use em dashes anywhere in your response.

Respond only with a JSON object with exactly these keys: summary (string), main_drivers (a list
of short strings), recommended_offer_id (string), strategy (string), communication_channel
(string), tone (string), email_subject (string), email_body (string)."""


class InvalidRecommendationError(Exception):
    """A Groq reply that failed JSON parsing, schema validation, or a content rule."""


class RetentionRecommendation(BaseModel):
    summary: str
    main_drivers: list[str]
    recommended_offer_id: str
    strategy: str
    communication_channel: str
    tone: str
    email_subject: str
    email_body: str


def clean_text(text):
    return re.sub(rf"\s*{EM_DASH}\s*", ", ", text).strip()


def _matches_range(value, minimum, maximum):
    if minimum is not None and value < minimum:
        return False
    if maximum is not None and value > maximum:
        return False
    return True


def is_eligible(offer, customer_row):
    """customer_row is a single pandas Series (one row of raw, un-encoded customer fields)."""
    eligibility = offer.get("eligibility") or {}
    for field in ("Contract", "PaymentMethod", "InternetService", "TechSupport", "OnlineSecurity"):
        allowed = eligibility.get(field)
        if allowed is not None and customer_row[field] not in allowed:
            return False
    if not _matches_range(customer_row["tenure"], eligibility.get("tenure_min"), eligibility.get("tenure_max")):
        return False
    if not _matches_range(
        customer_row["MonthlyCharges"], eligibility.get("MonthlyCharges_min"), eligibility.get("MonthlyCharges_max")
    ):
        return False
    return True


def eligible_offers(offers_catalog, customer_row):
    eligible = [offer for offer in offers_catalog if is_eligible(offer, customer_row)]
    if eligible:
        return eligible
    # Every catalog should include at least one offer with no eligibility rules, but guard anyway.
    return [offer for offer in offers_catalog if not offer.get("eligibility")]


def rank_offers(offers, customer_row_df, original_probability, pipeline, encode_fn, apply_overrides_fn, business_config):
    """Simulate each offer's feature_override (if it has one) and rank by estimated expected value.

    Expected value = (probability reduction) * revenue_lost_per_churn - offer_cost - cost_of_contact.
    Offers with no feature_override cannot be simulated, so they carry no estimate and sort last.
    """
    revenue_lost = business_config["revenue_lost_per_churn"]
    contact_cost = business_config["cost_of_contact"]

    ranked = []
    for offer in offers:
        override = offer.get("feature_override")
        new_probability = None
        expected_value = None
        if override:
            simulated = apply_overrides_fn(customer_row_df, override)
            new_probability = float(pipeline.predict_proba(encode_fn(simulated))[0, 1])
            reduction = max(0.0, original_probability - new_probability)
            expected_value = reduction * revenue_lost - offer["cost"] - contact_cost

        ranked.append({
            "id": offer["id"],
            "name": offer["name"],
            "description": offer["description"],
            "cost": offer["cost"],
            "hypothetical_new_probability": round(new_probability, 4) if new_probability is not None else None,
            "estimated_expected_value": round(expected_value, 2) if expected_value is not None else None,
        })

    ranked.sort(key=lambda item: item["estimated_expected_value"] if item["estimated_expected_value"] is not None else float("-inf"), reverse=True)
    return ranked


def build_context(customer_id, probability, risk_level, top_driver_sentences, ranked_offers):
    return {
        "customer_id": customer_id,
        "churn_probability": round(probability, 4),
        "risk_level": risk_level,
        "top_drivers": top_driver_sentences[:TOP_DRIVER_CONTEXT_COUNT],
        "eligible_offers": ranked_offers,
    }


def build_prompt(context):
    driver_lines = "\n".join(f"- {driver}" for driver in context["top_drivers"]) or "- No single feature stands out."
    offer_lines = "\n".join(
        "- id: {id}, name: {name}, cost: {cost:.2f}, description: {description}, "
        "hypothetical new probability: {prob}, estimated expected value: {value}".format(
            id=offer["id"],
            name=offer["name"],
            cost=offer["cost"],
            description=offer["description"],
            prob=offer["hypothetical_new_probability"] if offer["hypothetical_new_probability"] is not None else "not simulated",
            value=offer["estimated_expected_value"] if offer["estimated_expected_value"] is not None else "not estimated",
        )
        for offer in context["eligible_offers"]
    )
    return (
        f"Customer id: {context['customer_id']}\n"
        f"Current churn probability: {context['churn_probability']}\n"
        f"Current risk level: {context['risk_level']}\n\n"
        f"Top drivers of this customer's churn risk:\n{driver_lines}\n\n"
        f"Eligible retention offers (recommended_offer_id must be one of these ids):\n{offer_lines}\n\n"
        "Recommend exactly one offer and write a short retention email for it."
    )


def is_sendable_email(subject, body, prompt):
    text = f"{subject} {body}"
    if not subject or not body or FORBIDDEN_EMAIL_TEXT.search(text):
        return False
    return not set(FIGURE.findall(text)) - set(FIGURE.findall(prompt))


def validate_recommendation(raw_text, eligible_offer_ids, prompt):
    try:
        parsed = json.loads(raw_text)
        recommendation = RetentionRecommendation.model_validate(parsed)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise InvalidRecommendationError(f"Invalid JSON or schema: {exc}") from exc

    if recommendation.recommended_offer_id not in eligible_offer_ids:
        raise InvalidRecommendationError(
            f"recommended_offer_id {recommendation.recommended_offer_id!r} is not one of the eligible offers"
        )
    if not is_sendable_email(recommendation.email_subject, recommendation.email_body, prompt):
        raise InvalidRecommendationError("Generated email broke the content rules")

    recommendation.email_subject = clean_text(recommendation.email_subject)
    recommendation.email_body = clean_text(recommendation.email_body)
    recommendation.summary = clean_text(recommendation.summary)
    recommendation.strategy = clean_text(recommendation.strategy)
    return recommendation


def request_groq_recommendation(prompt, eligible_offer_ids):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"), timeout=GROQ_TIMEOUT_SECONDS, max_retries=0)
    last_error: Optional[Exception] = None

    for _ in range(GROQ_MAX_ATTEMPTS):
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "system", "content": RETENTION_SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=GROQ_TEMPERATURE,
            max_tokens=GROQ_MAX_TOKENS,
        )
        content = response.choices[0].message.content
        try:
            return validate_recommendation(content, eligible_offer_ids, prompt)
        except InvalidRecommendationError as exc:
            last_error = exc
            continue

    raise last_error


def fallback_recommendation(context):
    best = context["eligible_offers"][0]
    top_driver = context["top_drivers"][0] if context["top_drivers"] else "overall account risk"

    return RetentionRecommendation(
        summary=(
            f"This customer is at {context['risk_level']} risk of churning "
            f"(model-estimated probability {context['churn_probability']:.2%}). {top_driver}."
        ),
        main_drivers=context["top_drivers"] or [top_driver],
        recommended_offer_id=best["id"],
        strategy=f"Lead with {best['name']}, the best-ranked offer for this customer's situation among those they are eligible for.",
        communication_channel="email",
        tone="warm and professional",
        email_subject=f"An offer for you: {best['name']}",
        email_body=(
            "Hi there,\n\n"
            f"We would like to offer you our {best['name']}.\n\n"
            f"{best['description']}\n\n"
            "If you have any questions, just reply to this email and our team will be happy to help.\n\n"
            "Warm regards,\nYour customer care team"
        ),
    )


def generate_recommendation(
    customer_id,
    customer_row_df,
    probability,
    risk_level,
    top_driver_sentences,
    pipeline,
    encode_fn,
    apply_overrides_fn,
    offers_catalog,
    business_config,
):
    """Build a grounded retention recommendation for one customer.

    Returns a dict with the verified context, the ranked eligible offers, the recommendation
    itself, and which source produced it ("groq" or "fallback_template").
    """
    customer_row = customer_row_df.iloc[0]
    eligible = eligible_offers(offers_catalog, customer_row)
    ranked = rank_offers(eligible, customer_row_df, probability, pipeline, encode_fn, apply_overrides_fn, business_config)
    context = build_context(customer_id, probability, risk_level, top_driver_sentences, ranked)
    eligible_ids = {offer["id"] for offer in ranked}
    prompt = build_prompt(context)

    source = "groq"
    try:
        recommendation = request_groq_recommendation(prompt, eligible_ids)
    except Exception:
        source = "fallback_template"
        recommendation = fallback_recommendation(context)

    return {
        "customer_id": customer_id,
        "churn_probability": context["churn_probability"],
        "risk_level": risk_level,
        "top_drivers": context["top_drivers"],
        "eligible_offers": ranked,
        "recommendation": recommendation.model_dump(),
        "source": source,
    }
