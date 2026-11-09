"""Tests for the Flask API. Groq is always mocked, so no API key or network access is needed."""
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
import numpy as np
import pandas as pd
import pytest
from groq import APITimeoutError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app as api

VALID_CUSTOMER = {
    "gender": "Female",
    "SeniorCitizen": 0,
    "Partner": "Yes",
    "Dependents": "No",
    "tenure": 1,
    "PhoneService": "No",
    "MultipleLines": "No phone service",
    "InternetService": "DSL",
    "OnlineSecurity": "No",
    "OnlineBackup": "Yes",
    "DeviceProtection": "No",
    "TechSupport": "No",
    "StreamingTV": "No",
    "StreamingMovies": "No",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check",
    "MonthlyCharges": 29.85,
    "TotalCharges": 29.85,
}
GOOD_MESSAGE = {
    "subject": "A little thank you from us",
    "body": "Hi there,\n\nWe would love to offer you our Loyalty Discount.\n\nWarm regards",
}


def groq_reply(message):
    content = message if isinstance(message, str) else json.dumps(message)
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def first_customer_id():
    return api.load_customers()["customerID"].iloc[0]


def assert_is_fallback(message, contract):
    offer = api.OFFERS[0]
    assert set(message) == {"subject", "body"}
    assert contract.lower() in message["body"]
    assert offer["description"] in message["body"]


@pytest.fixture
def client():
    api.app.config.update(TESTING=True)
    with api.app.test_client() as test_client:
        yield test_client


@pytest.fixture
def groq():
    with patch("app.Groq") as mock_groq:
        mock_groq.return_value.chat.completions.create.return_value = groq_reply(GOOD_MESSAGE)
        yield mock_groq


def groq_create(mock_groq):
    return mock_groq.return_value.chat.completions.create


def test_health_returns_status_and_timestamp(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert "timestamp" in response.get_json()


def test_predict_valid_customer(client):
    response = client.post("/predict", json=VALID_CUSTOMER)
    assert response.status_code == 200
    data = response.get_json()
    assert 0 <= data["churn_probability"] <= 1
    assert data["risk_level"] in {"high", "medium", "low"}
    assert len(data["top_reasons"]) == 3
    assert all(isinstance(reason, str) for reason in data["top_reasons"])


def test_predict_missing_fields_returns_400(client):
    partial = {key: value for key, value in VALID_CUSTOMER.items() if key not in {"tenure", "Contract"}}
    response = client.post("/predict", json=partial)
    assert response.status_code == 400
    details = " ".join(response.get_json()["details"])
    assert "tenure" in details and "Contract" in details


@pytest.mark.parametrize("field, value, expected", [
    ("Contract", "two year", "Month-to-month"),
    ("MonthlyCharges", "lots", "MonthlyCharges"),
    ("MonthlyCharges", -1, "MonthlyCharges"),
    ("MonthlyCharges", True, "MonthlyCharges"),
    ("TotalCharges", 1e300, "TotalCharges"),
    ("SeniorCitizen", 2, "SeniorCitizen"),
    ("tenure", 1.5, "tenure"),
])
def test_predict_invalid_values_return_400(client, field, value, expected):
    response = client.post("/predict", json={**VALID_CUSTOMER, field: value})
    assert response.status_code == 400
    assert expected in " ".join(response.get_json()["details"])


def test_predict_rejects_non_json_body(client):
    response = client.post("/predict", data="not json", content_type="text/plain")
    assert response.status_code == 400
    assert "JSON" in response.get_json()["error"]


def test_encoding_matches_training():
    customers = api.load_customers().dropna(subset=["TotalCharges"])
    raw = customers.drop(columns=["customerID", "Churn"])
    expected = pd.get_dummies(raw, columns=raw.select_dtypes(exclude="number").columns.tolist(), drop_first=True, dtype=int)
    pd.testing.assert_frame_equal(api.encode_customers(customers), expected[api.FEATURE_COLUMNS], check_dtype=False)


@pytest.mark.parametrize("probability, expected", [
    (0.51, "high"), (0.5, "medium"), (0.31, "medium"), (0.3, "low"), (0.0, "low"),
])
def test_risk_level_boundaries(probability, expected):
    assert api.risk_level(probability) == expected


def test_at_risk_returns_sorted_list(client):
    response = client.get("/customers/at-risk")
    assert response.status_code == 200
    customers = response.get_json()
    assert isinstance(customers, list)
    assert len(customers) == api.DEFAULT_AT_RISK_COUNT
    for customer in customers:
        assert {"customerID", "churn_probability", "risk_level", "top_reasons"} <= set(customer)
        assert len(customer["top_reasons"]) == 3
    probabilities = [customer["churn_probability"] for customer in customers]
    assert probabilities == sorted(probabilities, reverse=True)


def test_at_risk_respects_n(client):
    assert len(client.get("/customers/at-risk?n=3").get_json()) == 3


def test_at_risk_includes_monthly_charges_from_data(client):
    item = client.get("/customers/at-risk?n=1").get_json()[0]
    customers = api.load_customers().set_index("customerID")
    assert item["monthly_charges"] == customers.loc[item["customerID"], "MonthlyCharges"]


def test_metrics_returns_full_metrics_file(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    saved = json.loads((api.ROOT / "models" / "metrics.json").read_text(encoding="utf-8"))
    assert response.get_json() == saved


def test_metrics_confusion_matrix_agrees_with_saved_metrics(client):
    data = client.get("/metrics").get_json()
    matrix = data["xgboost_test_tuned_confusion_matrix"]
    tuned = data["xgboost_test_tuned_threshold"]
    tp, fp, fn = matrix["true_positive"], matrix["false_positive"], matrix["false_negative"]
    assert tp / (tp + fp) == pytest.approx(tuned["precision"])
    assert tp / (tp + fn) == pytest.approx(tuned["recall"])


def test_at_risk_only_returns_active_customers(client):
    returned = client.get(f"/customers/at-risk?n={api.MAX_AT_RISK_COUNT}").get_json()
    customers = api.load_customers().set_index("customerID")
    assert len(returned) == api.MAX_AT_RISK_COUNT
    assert set(customers.loc[[item["customerID"] for item in returned], "Churn"]) == {"No"}


@pytest.mark.parametrize("n", ["abc", "0", "-1", "51", "2.5"])
def test_at_risk_rejects_bad_n(client, n):
    response = client.get(f"/customers/at-risk?n={n}")
    assert response.status_code == 400
    assert "n must be" in response.get_json()["error"]


def test_retention_with_customer_id(client, groq):
    response = client.post("/retention-message", json={"customer_id": first_customer_id()})
    assert response.status_code == 200
    assert response.get_json() == GOOD_MESSAGE


def test_retention_with_customer_fields(client, groq):
    response = client.post("/retention-message", json=VALID_CUSTOMER)
    assert response.status_code == 200
    assert response.get_json() == GOOD_MESSAGE


def test_retention_prompt_contains_only_allowed_data(client, groq):
    customer_id = first_customer_id()
    client.post("/retention-message", json={"customer_id": customer_id})
    kwargs = groq_create(groq).call_args.kwargs
    assert kwargs["model"] == api.GROQ_MODEL
    prompt = " ".join(message["content"] for message in kwargs["messages"])

    customer = api.load_customers().iloc[[0]]
    encoded = api.encode_customers(customer)
    for reason in api.top_reasons(encoded):
        assert reason in prompt
    assert customer["Contract"].iloc[0] in prompt
    assert f"{customer['MonthlyCharges'].iloc[0]:.2f}" in prompt
    for offer in api.OFFERS:
        assert offer["description"] in prompt
    assert "warm and friendly" in prompt

    probability = float(api.PIPELINE.predict_proba(encoded)[0, 1])
    assert customer_id not in prompt
    assert str(round(probability, api.PROBABILITY_DECIMALS)) not in prompt


def test_retention_groq_client_has_timeout_and_no_retries(client, groq):
    client.post("/retention-message", json={"customer_id": first_customer_id()})
    assert groq.call_args.kwargs["timeout"] == api.GROQ_TIMEOUT_SECONDS
    assert groq.call_args.kwargs["max_retries"] == 0


@pytest.mark.parametrize("error", [
    APITimeoutError(request=httpx.Request("POST", "https://example.test")),
    RuntimeError("service unavailable"),
])
def test_retention_falls_back_when_groq_fails(client, groq, error):
    groq_create(groq).side_effect = error
    response = client.post("/retention-message", json=VALID_CUSTOMER)
    assert response.status_code == 200
    assert_is_fallback(response.get_json(), VALID_CUSTOMER["Contract"])


def test_retention_falls_back_without_api_key(client):
    without_key = {key: value for key, value in os.environ.items() if key != "GROQ_API_KEY"}
    with patch.dict(os.environ, without_key, clear=True):
        response = client.post("/retention-message", json=VALID_CUSTOMER)
    assert response.status_code == 200
    assert_is_fallback(response.get_json(), VALID_CUSTOMER["Contract"])


@pytest.mark.parametrize("reply", [
    "this is not json",
    {"subject": "Missing the body"},
    {"subject": "", "body": "Empty subject"},
    {"subject": "Hello", "body": "Your churn risk is high."},
    {"subject": "Hello", "body": "Your score is excellent."},
    {"subject": "Hello", "body": "Dear [Customer Name], welcome."},
    {"subject": "Hello", "body": "Enjoy 50% off for life."},
])
def test_retention_falls_back_on_unusable_reply(client, groq, reply):
    groq_create(groq).return_value = groq_reply(reply)
    response = client.post("/retention-message", json=VALID_CUSTOMER)
    assert response.status_code == 200
    assert_is_fallback(response.get_json(), VALID_CUSTOMER["Contract"])


def test_retention_allows_figures_from_offers(client, groq):
    message = {"subject": "Hello", "body": "Enjoy 15% off your bill for the next 6 months."}
    groq_create(groq).return_value = groq_reply(message)
    assert client.post("/retention-message", json=VALID_CUSTOMER).get_json() == message


def test_retention_removes_em_dashes_from_reply(client, groq):
    groq_create(groq).return_value = groq_reply({"subject": f"Hello {api.EM_DASH} friend", "body": f"Thanks {api.EM_DASH} truly."})
    data = client.post("/retention-message", json=VALID_CUSTOMER).get_json()
    assert data == {"subject": "Hello, friend", "body": "Thanks, truly."}


def test_retention_unknown_customer_returns_404(client):
    response = client.post("/retention-message", json={"customer_id": "0000-NOPE"})
    assert response.status_code == 404
    assert "0000-NOPE" in response.get_json()["error"]


def test_retention_customer_without_total_charges_returns_422(client):
    customers = api.load_customers()
    customer_id = customers.loc[customers["TotalCharges"].isna(), "customerID"].iloc[0]
    response = client.post("/retention-message", json={"customer_id": customer_id})
    assert response.status_code == 422
    assert "TotalCharges" in response.get_json()["error"]


@pytest.mark.parametrize("body, status_text", [
    ({}, "customer_id"),
    ({"customer_id": 123}, "customer_id"),
    ({"customer_id": "  "}, "customer_id"),
    ({"customer_id": "7590-VHVEG", "tenure": 1}, "not both"),
])
def test_retention_invalid_requests_return_400(client, body, status_text):
    response = client.post("/retention-message", json=body)
    assert response.status_code == 400
    assert status_text in response.get_json()["error"]


def test_offers_file_structure():
    assert len(api.OFFERS) == 3
    for offer in api.OFFERS:
        assert set(offer) == {"id", "title", "description"}


def test_unexpected_error_returns_json_500(client, monkeypatch):
    monkeypatch.setitem(api.app.config, "PROPAGATE_EXCEPTIONS", False)
    with patch("app.encode_customers", side_effect=RuntimeError("secret detail")):
        response = client.post("/predict", json=VALID_CUSTOMER)
    assert response.status_code == 500
    assert "error" in response.get_json()
    assert "secret detail" not in response.get_data(as_text=True)


def test_unknown_route_returns_json_404(client):
    response = client.get("/nope")
    assert response.status_code == 404
    assert "error" in response.get_json()


@pytest.mark.parametrize("level", ["high", "medium", "low"])
def test_by_risk_returns_only_matching_level_sorted_desc(client, level):
    response = client.get(f"/customers/by-risk?level={level}&n={api.MAX_AT_RISK_COUNT}")
    assert response.status_code == 200
    customers = response.get_json()
    assert all(customer["risk_level"] == level for customer in customers)
    probabilities = [customer["churn_probability"] for customer in customers]
    assert probabilities == sorted(probabilities, reverse=True)


def test_by_risk_respects_n(client):
    assert len(client.get("/customers/by-risk?level=high&n=3").get_json()) == 3


def test_by_risk_rejects_bad_level(client):
    response = client.get("/customers/by-risk?level=critical&n=5")
    assert response.status_code == 400
    assert "level must be" in response.get_json()["error"]


def test_by_risk_requires_level(client):
    response = client.get("/customers/by-risk?n=5")
    assert response.status_code == 400


def test_summary_counts_match_full_active_population(client):
    response = client.get("/customers/summary")
    assert response.status_code == 200
    data = response.get_json()

    customers = api.load_customers()
    customers = customers[customers["Churn"] == "No"].dropna(subset=["TotalCharges"])
    probabilities = api.PIPELINE.predict_proba(api.encode_customers(customers))[:, 1]
    levels = [api.risk_level(p) for p in probabilities]

    assert data["total_customers"] == len(customers)
    assert data["risk_counts"] == {level: levels.count(level) for level in ("high", "medium", "low")}
    assert data["avg_churn_probability"] == round(float(np.mean(probabilities)), api.PROBABILITY_DECIMALS)
    assert sum(bucket["count"] for bucket in data["probability_distribution"]) == len(customers)
    assert len(data["probability_distribution"]) == api.PROBABILITY_BUCKET_COUNT


def test_summary_revenue_at_risk_is_sum_of_high_risk_monthly_charges(client):
    data = client.get("/customers/summary").get_json()
    customers = api.load_customers()
    customers = customers[customers["Churn"] == "No"].dropna(subset=["TotalCharges"])
    probabilities = api.PIPELINE.predict_proba(api.encode_customers(customers))[:, 1]
    expected = sum(
        charge for charge, p in zip(customers["MonthlyCharges"], probabilities) if api.risk_level(p) == "high"
    )
    assert data["revenue_at_risk"] == round(expected, 2)


def test_customer_detail_returns_profile_and_prediction(client):
    customer_id = first_customer_id()
    response = client.get(f"/customers/{customer_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["customerID"] == customer_id
    assert {"churn_probability", "risk_level", "top_reasons", "contract", "tenure", "monthly_charges"} <= set(data)
    assert len(data["top_reasons"]) == 3


def test_customer_detail_unknown_customer_returns_404(client):
    response = client.get("/customers/0000-NOPE")
    assert response.status_code == 404


def test_customer_detail_without_total_charges_returns_422(client):
    customers = api.load_customers()
    customer_id = customers.loc[customers["TotalCharges"].isna(), "customerID"].iloc[0]
    response = client.get(f"/customers/{customer_id}")
    assert response.status_code == 422


def test_shap_global_returns_top_features_sorted_desc(client):
    response = client.get("/shap/global")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == api.TOP_GLOBAL_SHAP_FEATURES
    for item in data:
        assert {"feature", "label", "importance", "share"} <= set(item)
        assert item["importance"] >= 0
        assert 0 <= item["share"] <= 1
        assert item["label"]
    importances = [item["importance"] for item in data]
    assert importances == sorted(importances, reverse=True)


def test_shap_global_is_cached_across_requests(client):
    first = client.get("/shap/global").get_json()
    second = client.get("/shap/global").get_json()
    assert first == second


def test_top_at_risk_customer_matches_pipeline(client):
    top = client.get("/customers/at-risk?n=1").get_json()[0]
    customers = api.load_customers()
    customers = customers[customers["Churn"] == "No"].dropna(subset=["TotalCharges"])
    probabilities = api.PIPELINE.predict_proba(api.encode_customers(customers))[:, 1]
    assert top["churn_probability"] == round(float(np.max(probabilities)), api.PROBABILITY_DECIMALS)
