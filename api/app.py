"""Flask API for churn predictions, explanations and retention messages."""
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq
from werkzeug.exceptions import HTTPException

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from explain import DEFAULT_DROPPED_LEVEL, DROPPED_LEVELS, _label, explain_customer, get_shap_values

load_dotenv(ROOT / ".env")

DATA_PATH = ROOT / "data" / "raw" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
DEFAULT_PORT = 5053

HIGH_RISK_THRESHOLD = 0.5
MEDIUM_RISK_THRESHOLD = 0.3
RISK_LEVELS = ("high", "medium", "low")
PROBABILITY_DECIMALS = 4

DEFAULT_AT_RISK_COUNT = 10
MAX_AT_RISK_COUNT = 50
PROBABILITY_BUCKET_COUNT = 10

GLOBAL_SHAP_SAMPLE_SIZE = 150
GLOBAL_SHAP_RANDOM_STATE = 0
TOP_GLOBAL_SHAP_FEATURES = 5

WHOLE_NUMBER_FIELDS = {"tenure", "SeniorCitizen"}
BINARY_FIELDS = {"SeniorCitizen"}
# XGBoost stores features as 32-bit floats, so larger values cannot be scored
MAX_FEATURE_VALUE = float(np.finfo(np.float32).max)

GROQ_MODEL = "openai/gpt-oss-20b"
GROQ_TIMEOUT_SECONDS = 10
GROQ_TEMPERATURE = 0.7
GROQ_MAX_TOKENS = 500

SYSTEM_PROMPT = """You write short retention emails for a telecom company.

Tone: warm and friendly.

Rules:
- Mention only offers from the list you are given, using their exact terms.
- Never promise anything that is not in the offers list. That includes other discounts, credits, upgrades, dates and guarantees.
- Never mention churn, probability, risk, scores or any internal analysis of the customer.
- The reasons you are given are private background to help you choose what to emphasize. Do not quote or repeat them.
- Greet the customer with "Hi there". Do not use placeholders such as [Name].
- Do not use em dashes.

Respond only with a JSON object that has exactly two string keys: "subject" for the subject line and "body" for the email body."""

# Output the model was told never to write, so a message containing any of it is not sent
FORBIDDEN_TEXT = re.compile(r"\b(?:churn\w*|probabilit\w*|scores?|risks?)\b|\[[^\]]+\]", re.IGNORECASE)
FIGURE = re.compile(r"\d+(?:\.\d+)?")
EM_DASH = chr(0x2014)

PIPELINE = joblib.load(ROOT / "models" / "pipeline.joblib")
METRICS = json.loads((ROOT / "models" / "metrics.json").read_text(encoding="utf-8"))
FEATURE_COLUMNS = METRICS["feature_columns"]
OFFERS = json.loads((Path(__file__).resolve().parent / "offers.json").read_text(encoding="utf-8"))["offers"]

CATEGORY_LEVELS = {}
for _column in FEATURE_COLUMNS:
    _feature, _, _level = _column.partition("_")
    if _level:
        CATEGORY_LEVELS.setdefault(_feature, [DROPPED_LEVELS.get(_feature, DEFAULT_DROPPED_LEVEL)]).append(_level)
NUMERIC_FIELDS = [column for column in FEATURE_COLUMNS if "_" not in column]
REQUIRED_FIELDS = NUMERIC_FIELDS + list(CATEGORY_LEVELS)

app = Flask(__name__)
CORS(app)


class ApiError(Exception):
    """A request problem reported to the client as a JSON error."""

    def __init__(self, message, status=400, details=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.details = details


def parse_number(value):
    """Return value as a finite float the model can score, or None if it is not one."""
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return number if math.isfinite(number) and abs(number) <= MAX_FEATURE_VALUE else None


def parse_customer(body):
    """Validate raw customer fields and return them as a one-row dataframe."""
    missing = [field for field in REQUIRED_FIELDS if body.get(field) in (None, "")]
    errors = [f"Missing required fields: {', '.join(missing)}"] if missing else []
    record = {}

    for field in NUMERIC_FIELDS:
        if field in missing:
            continue
        number = parse_number(body[field])
        if number is None or number < 0:
            errors.append(f"{field} must be a non-negative number, got {body[field]!r}")
        elif field in BINARY_FIELDS and number not in (0, 1):
            errors.append(f"{field} must be 0 or 1, got {body[field]!r}")
        elif field in WHOLE_NUMBER_FIELDS and not number.is_integer():
            errors.append(f"{field} must be a whole number, got {body[field]!r}")
        else:
            record[field] = number

    for field, levels in CATEGORY_LEVELS.items():
        if field in missing:
            continue
        if body[field] in levels:
            record[field] = body[field]
        else:
            errors.append(f"{field} must be one of: {', '.join(levels)}. Got {body[field]!r}")

    if errors:
        raise ApiError("Invalid customer record", details=errors)
    return pd.DataFrame([record])


def json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError("Request body must be a JSON object sent with Content-Type: application/json")
    return body


def encode_customers(customers):
    """Build the one-hot columns the pipeline was trained on from raw customer fields."""
    encoded = {}
    for column in FEATURE_COLUMNS:
        feature, _, level = column.partition("_")
        encoded[column] = (customers[feature] == level).astype(int) if level else customers[feature]
    return pd.DataFrame(encoded, columns=FEATURE_COLUMNS, index=customers.index)


def risk_level(probability):
    if probability > HIGH_RISK_THRESHOLD:
        return "high"
    if probability > MEDIUM_RISK_THRESHOLD:
        return "medium"
    return "low"


def top_reasons(encoded_row):
    return [item["reason"] for item in explain_customer(PIPELINE, encoded_row, FEATURE_COLUMNS)]


def describe_customer(encoded_row, probability):
    probability = float(probability)
    return {
        "churn_probability": round(probability, PROBABILITY_DECIMALS),
        "risk_level": risk_level(probability),
        "top_reasons": top_reasons(encoded_row),
    }


@lru_cache(maxsize=1)
def load_customers():
    """Load the raw customer file. Blank TotalCharges values become NaN, as in training."""
    customers = pd.read_csv(DATA_PATH)
    customers["TotalCharges"] = pd.to_numeric(customers["TotalCharges"], errors="coerce")
    return customers


def find_customer(customer_id):
    if not isinstance(customer_id, str) or not customer_id.strip():
        raise ApiError(f"customer_id must be a non-empty string, got {customer_id!r}")
    customers = load_customers()
    customer = customers[customers["customerID"] == customer_id.strip()]
    if customer.empty:
        raise ApiError(f"No customer found with customer_id {customer_id!r}", status=404)
    if customer["TotalCharges"].isna().any():
        raise ApiError(
            f"Customer {customer_id!r} has no TotalCharges on record, so it cannot be scored. "
            "Send a full set of customer fields instead.",
            status=422,
        )
    return customer


def parse_at_risk_count(raw_value):
    limits = f"n must be a whole number from 1 to {MAX_AT_RISK_COUNT}, got {raw_value!r}"
    try:
        n = int(raw_value)
    except ValueError:
        raise ApiError(limits) from None
    if not 1 <= n <= MAX_AT_RISK_COUNT:
        raise ApiError(limits)
    return n


def parse_risk_level(raw_value):
    if raw_value not in RISK_LEVELS:
        raise ApiError(f"level must be one of: {', '.join(RISK_LEVELS)}. Got {raw_value!r}")
    return raw_value


def build_groq_prompt(reasons, contract, monthly_charges):
    reason_lines = "\n".join(f"- {reason}" for reason in reasons)
    offer_lines = "\n".join(f"- {offer['title']}: {offer['description']}" for offer in OFFERS)
    return (
        f"Private background on this customer:\n{reason_lines}\n\n"
        f"Contract type: {contract}\n"
        f"Monthly charges: {monthly_charges:.2f}\n\n"
        f"Available offers (the only offers you may mention):\n{offer_lines}\n\n"
        "Write a short retention email with a subject line and body."
    )


def clean_generated_text(text):
    return re.sub(rf"\s*{EM_DASH}\s*", ", ", text).strip()


def is_sendable(message, prompt):
    """Reject output that breaks the prompt rules, including any figure the prompt did not supply."""
    text = f"{message['subject']} {message['body']}"
    if not message["subject"] or not message["body"] or FORBIDDEN_TEXT.search(text):
        return False
    return not set(FIGURE.findall(text)) - set(FIGURE.findall(prompt))


def request_groq_message(prompt):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"), timeout=GROQ_TIMEOUT_SECONDS, max_retries=0)
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=GROQ_TEMPERATURE,
        max_tokens=GROQ_MAX_TOKENS,
    )
    message = json.loads(response.choices[0].message.content)
    return {"subject": clean_generated_text(message["subject"]), "body": clean_generated_text(message["body"])}


def fallback_message(contract):
    offer = OFFERS[0]
    return {
        "subject": f"A thank you from us: {offer['title']}",
        "body": (
            f"Hi there,\n\n"
            f"Thank you for being with us on your {contract.lower()} plan. "
            f"We appreciate having you as a customer and would like to share an offer with you.\n\n"
            f"{offer['title']}: {offer['description']}\n\n"
            f"If you have any questions, just reply to this email and our team will be happy to help.\n\n"
            f"Warm regards,\nYour customer care team"
        ),
    }


def write_retention_message(customer):
    contract = customer["Contract"].iloc[0]
    reasons = top_reasons(encode_customers(customer))
    prompt = build_groq_prompt(reasons, contract, customer["MonthlyCharges"].iloc[0])
    try:
        message = request_groq_message(prompt)
    except Exception as exc:
        # Every failure here, including a timeout or malformed reply, must still produce a message
        app.logger.warning("Groq call failed, using fallback message: %s", exc)
        return fallback_message(contract)
    if not is_sendable(message, prompt):
        app.logger.warning("Groq reply broke the message rules, using fallback message")
        return fallback_message(contract)
    return message


@app.errorhandler(ApiError)
def handle_api_error(error):
    payload = {"error": error.message}
    if error.details:
        payload["details"] = error.details
    return jsonify(payload), error.status


@app.errorhandler(HTTPException)
def handle_http_error(error):
    return jsonify(error=error.description), error.code


@app.errorhandler(500)
def handle_server_error(error):
    return jsonify(error="Internal server error. Check the server logs for details."), 500


@app.get("/health")
def health():
    return jsonify(status="ok", timestamp=datetime.now(timezone.utc).isoformat())


@app.post("/predict")
def predict():
    encoded = encode_customers(parse_customer(json_body()))
    probability = PIPELINE.predict_proba(encoded)[0, 1]
    return jsonify(describe_customer(encoded, probability))


@app.get("/customers/at-risk")
def customers_at_risk():
    n = parse_at_risk_count(request.args.get("n", str(DEFAULT_AT_RISK_COUNT)))
    customers = load_customers()
    customers = customers[customers["Churn"] == "No"].dropna(subset=["TotalCharges"])
    encoded = encode_customers(customers)
    probabilities = PIPELINE.predict_proba(encoded)[:, 1]
    top = np.argsort(-probabilities, kind="stable")[:n]
    return jsonify([
        {
            "customerID": customers["customerID"].iloc[position],
            "monthly_charges": float(customers["MonthlyCharges"].iloc[position]),
            **describe_customer(encoded.iloc[[position]], probabilities[position]),
        }
        for position in top
    ])


@app.get("/customers/by-risk")
def customers_by_risk():
    """The highest-probability active customers within a single risk level."""
    level = parse_risk_level(request.args.get("level", ""))
    n = parse_at_risk_count(request.args.get("n", str(DEFAULT_AT_RISK_COUNT)))
    customers = load_customers()
    customers = customers[customers["Churn"] == "No"].dropna(subset=["TotalCharges"])
    encoded = encode_customers(customers)
    probabilities = PIPELINE.predict_proba(encoded)[:, 1]
    levels = np.array([risk_level(probability) for probability in probabilities])
    matching = np.where(levels == level)[0]
    top = matching[np.argsort(-probabilities[matching], kind="stable")][:n]
    return jsonify([
        {
            "customerID": customers["customerID"].iloc[position],
            "monthly_charges": float(customers["MonthlyCharges"].iloc[position]),
            **describe_customer(encoded.iloc[[position]], probabilities[position]),
        }
        for position in top
    ])


@app.get("/customers/summary")
def customers_summary():
    """Aggregate churn risk across every active, scorable customer (not just the at-risk sample)."""
    customers = load_customers()
    customers = customers[customers["Churn"] == "No"].dropna(subset=["TotalCharges"])
    encoded = encode_customers(customers)
    probabilities = PIPELINE.predict_proba(encoded)[:, 1]
    levels = np.array([risk_level(probability) for probability in probabilities])

    bucket_edges = np.linspace(0, 1, PROBABILITY_BUCKET_COUNT + 1)
    bucket_counts = np.histogram(probabilities, bins=bucket_edges)[0]
    probability_distribution = [
        {
            "range": f"{round(bucket_edges[i] * 100)}-{round(bucket_edges[i + 1] * 100)}%",
            "count": int(bucket_counts[i]),
        }
        for i in range(PROBABILITY_BUCKET_COUNT)
    ]

    return jsonify({
        "total_customers": int(len(customers)),
        "risk_counts": {level: int((levels == level).sum()) for level in ("high", "medium", "low")},
        "avg_churn_probability": round(float(probabilities.mean()), PROBABILITY_DECIMALS),
        "revenue_at_risk": round(float(customers["MonthlyCharges"].to_numpy()[levels == "high"].sum()), 2),
        "probability_distribution": probability_distribution,
    })


@app.get("/customers/<customer_id>")
def customer_detail(customer_id):
    customer = find_customer(customer_id)
    encoded = encode_customers(customer)
    probability = PIPELINE.predict_proba(encoded)[0, 1]
    row = customer.iloc[0]
    return jsonify({
        "customerID": row["customerID"],
        "monthly_charges": float(row["MonthlyCharges"]),
        "total_charges": float(row["TotalCharges"]),
        "tenure": int(row["tenure"]),
        "contract": row["Contract"],
        "payment_method": row["PaymentMethod"],
        "paperless_billing": row["PaperlessBilling"],
        "internet_service": row["InternetService"],
        "phone_service": row["PhoneService"],
        "gender": row["gender"],
        "senior_citizen": bool(row["SeniorCitizen"]),
        "partner": row["Partner"],
        "dependents": row["Dependents"],
        **describe_customer(encoded, probability),
    })


@app.get("/metrics")
def metrics():
    return jsonify(METRICS)


@lru_cache(maxsize=1)
def global_shap_importance():
    """Mean absolute SHAP impact per source feature, sampled from the active customer base."""
    customers = load_customers()
    customers = customers[customers["Churn"] == "No"].dropna(subset=["TotalCharges"])
    sample = customers.sample(n=min(GLOBAL_SHAP_SAMPLE_SIZE, len(customers)), random_state=GLOBAL_SHAP_RANDOM_STATE)
    encoded = encode_customers(sample)
    _, shap_values = get_shap_values(PIPELINE, encoded[FEATURE_COLUMNS])
    shap_df = pd.DataFrame(shap_values, columns=FEATURE_COLUMNS)
    source_feature = {column: column.partition("_")[0] for column in FEATURE_COLUMNS}
    # One-hot sub-columns of the same feature are mutually exclusive per row, so summing their
    # absolute SHAP values per row gives that feature's total contribution for that customer.
    grouped = shap_df.abs().T.groupby(source_feature).sum().T
    return grouped.mean(axis=0).sort_values(ascending=False)


@app.get("/shap/global")
def shap_global():
    importance = global_shap_importance()
    total = float(importance.sum())
    top = importance.iloc[:TOP_GLOBAL_SHAP_FEATURES]
    return jsonify([
        {
            "feature": feature,
            "label": _label(feature),
            "importance": round(float(value), 6),
            "share": round(float(value) / total, 4) if total else 0.0,
        }
        for feature, value in top.items()
    ])


@app.post("/retention-message")
def retention_message():
    body = json_body()
    has_fields = bool(set(body) & set(REQUIRED_FIELDS))
    if "customer_id" in body and has_fields:
        raise ApiError("Send either customer_id or customer fields, not both")
    if "customer_id" in body:
        customer = find_customer(body["customer_id"])
    elif has_fields:
        customer = parse_customer(body)
    else:
        raise ApiError(f"Send either a customer_id string or all customer fields: {', '.join(REQUIRED_FIELDS)}")
    return jsonify(write_retention_message(customer))


if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", DEFAULT_PORT)))
