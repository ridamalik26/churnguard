"""Run src/explain.py against the saved pipeline and print one real customer explanation."""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from explain import DEFAULT_DROPPED_LEVEL, DROPPED_LEVELS, explain_customer_text, global_feature_importance

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "raw" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
PIPELINE_PATH = ROOT / "models" / "pipeline.joblib"
METRICS_PATH = ROOT / "models" / "metrics.json"
PLOT_PATH = ROOT / "notebooks" / "plots" / "shap_global.png"

RANDOM_STATE = 42
HOLDOUT_SIZE = 0.30
TEST_SHARE_OF_HOLDOUT = 0.50
SAMPLE_SIZE = 200
AT_RISK_THRESHOLD = 0.5


def load_clean_data():
    """Repeat the cleaning from Step 3 of the notebook."""
    data = pd.read_csv(DATA_PATH)
    data["TotalCharges"] = pd.to_numeric(data["TotalCharges"].replace(r"^\s*$", np.nan, regex=True), errors="coerce")
    data = data.dropna(subset=["TotalCharges"])
    data = data.drop(columns=["customerID"])
    data["Churn"] = (data["Churn"] == "Yes").astype(int)
    cat_cols = data.select_dtypes(exclude="number").columns.tolist()
    for col in cat_cols:
        assert DROPPED_LEVELS.get(col, DEFAULT_DROPPED_LEVEL) == sorted(data[col].unique())[0], col
    data = pd.get_dummies(data, columns=cat_cols, drop_first=True, dtype=int)
    return data.drop(columns="Churn"), data["Churn"]


def load_test_set():
    """Repeat the stratified split from Step 4 of the notebook."""
    X, y = load_clean_data()
    _, X_temp, _, y_temp = train_test_split(X, y, test_size=HOLDOUT_SIZE, stratify=y, random_state=RANDOM_STATE)
    _, X_test, _, y_test = train_test_split(
        X_temp, y_temp, test_size=TEST_SHARE_OF_HOLDOUT, stratify=y_temp, random_state=RANDOM_STATE
    )
    return X_test, y_test


def main():
    pipeline = joblib.load(PIPELINE_PATH)
    X_test, y_test = load_test_set()

    # Scoring the rebuilt test set must reproduce the saved metric, or this is not the same split
    assert list(X_test.columns) == list(pipeline.feature_names_in_)
    saved_auc = json.loads(METRICS_PATH.read_text())["xgboost_test_default_threshold"]["roc_auc"]
    assert np.isclose(roc_auc_score(y_test, pipeline.predict_proba(X_test)[:, 1]), saved_auc)

    sample = X_test.iloc[:SAMPLE_SIZE]
    global_feature_importance(pipeline, sample, PLOT_PATH)
    print(f"Saved global importance plot to {PLOT_PATH.relative_to(ROOT).as_posix()}")

    probabilities = pipeline.predict_proba(sample)[:, 1]
    at_risk = np.flatnonzero(probabilities > AT_RISK_THRESHOLD)
    if at_risk.size == 0:
        raise SystemExit(f"No customer in the first {SAMPLE_SIZE} test rows is above {AT_RISK_THRESHOLD}")

    position = at_risk[0]
    print(f"First at-risk customer: test row {position}, churn probability {probabilities[position]:.4f}")
    print(explain_customer_text(pipeline, sample.iloc[[position]], sample.columns.tolist()))


if __name__ == "__main__":
    main()
