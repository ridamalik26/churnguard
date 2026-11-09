"""SHAP explanations for the churn pipeline saved by src/train_advanced.py."""
import re
from functools import lru_cache
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

TOP_REASONS = 3
WATERFALL_TOP_FEATURES = 10

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "raw" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
LINEAR_BACKGROUND_SIZE = 200
LINEAR_BACKGROUND_SEED = 42

# Levels removed by get_dummies(drop_first=True), which leaves no column to read them from.
# src/verify_explain.py checks these against the raw data.
DROPPED_LEVELS = {
    "Contract": "Month-to-month",
    "InternetService": "DSL",
    "PaymentMethod": "Bank transfer (automatic)",
    "gender": "Female",
}
DEFAULT_DROPPED_LEVEL = "No"

BAR_COLOR = "#2a78d6"
SURFACE_COLOR = "#fcfcfb"
PRIMARY_INK = "#0b0b0b"
SECONDARY_INK = "#52514e"
GRID_COLOR = "#e1e0d9"
BASELINE_COLOR = "#c3c2b7"


def _label(feature):
    """Turn a column name such as StreamingTV into readable text such as Streaming TV."""
    words = re.findall(r"[A-Z]+(?![a-z])|[A-Z]?[a-z]+", feature)
    text = " ".join(word if word.isupper() else word.lower() for word in words)
    return text[0].upper() + text[1:]


def _source_feature(column):
    """Return the original feature behind a column, so Contract_Two year gives Contract."""
    return column.partition("_")[0]


def _chart_label(column):
    feature, _, level = column.partition("_")
    return f"{_label(feature)}: {level}" if level else _label(feature)


def _customer_level(feature, row_df):
    """Return the category a customer belongs to for a one-hot encoded feature."""
    for column in row_df.columns:
        if _source_feature(column) == feature and row_df[column].iloc[0] == 1:
            return column.partition("_")[2]
    return DROPPED_LEVELS.get(feature, DEFAULT_DROPPED_LEVEL)


def _numeric_subject(feature, value):
    if feature == "tenure":
        return f"Tenure of {value:g} {'month' if value == 1 else 'months'}"
    if feature == "MonthlyCharges":
        return f"Monthly charge of {value:.2f}"
    if feature == "TotalCharges":
        return f"Total charge of {value:.2f}"
    if feature == "SeniorCitizen":
        return "Being a senior citizen" if value == 1 else "Not being a senior citizen"
    return f"{_label(feature)} of {value:g}"


def _category_subject(feature, level):
    label = _label(feature)
    name = label[0].lower() + label[1:]
    if level == "Yes":
        return f"Having {'a ' if feature == 'Partner' else ''}{name}"
    if level == "No":
        return f"No {name}"
    if level.startswith("No "):
        return f"No {name} ({level.lower()})"
    return f"{level} {name}"


@lru_cache(maxsize=4)
def _linear_background(feature_names):
    """A fixed sample of real, already one-hot-encoded rows to use as a LinearExplainer background."""
    data = pd.read_csv(DATA_PATH)
    data["TotalCharges"] = pd.to_numeric(data["TotalCharges"].replace(r"^\s*$", np.nan, regex=True), errors="coerce")
    data = data.dropna(subset=["TotalCharges"]).drop(columns=["customerID"])
    cat_cols = data.drop(columns="Churn").select_dtypes(exclude="number").columns.tolist()
    encoded = pd.get_dummies(data.drop(columns="Churn"), columns=cat_cols, drop_first=True, dtype=int)
    encoded = encoded.reindex(columns=list(feature_names), fill_value=0)
    return encoded.sample(n=min(LINEAR_BACKGROUND_SIZE, len(encoded)), random_state=LINEAR_BACKGROUND_SEED)


def _is_linear_model(model):
    """True for models explained by their coefficients (e.g. LogisticRegression), false for tree ensembles."""
    return hasattr(model, "coef_")


def get_shap_values(pipeline, X_df):
    """Return a SHAP explainer and values whose columns line up with X_df.columns.

    Tree ensembles (XGBoost, Random Forest, LightGBM) use TreeExplainer. Linear models
    (Logistic Regression) use LinearExplainer against a fixed background sample, since they
    have no tree structure to walk.
    """
    preprocessor = pipeline.named_steps["preprocessor"]
    model = pipeline.named_steps["model"]
    transformed = preprocessor.transform(X_df)

    if _is_linear_model(model):
        background = _linear_background(tuple(X_df.columns))
        explainer = shap.LinearExplainer(model, preprocessor.transform(background))
    else:
        explainer = shap.TreeExplainer(model)

    shap_values = explainer.shap_values(transformed)
    if isinstance(shap_values, list):
        # Some tree explainers return one array per class for binary classifiers
        shap_values = shap_values[1]

    # The preprocessor moves the scaled numeric columns to the front, so restore the order of X_df
    transformed_names = [name.split("__", 1)[1] for name in preprocessor.get_feature_names_out()]
    order = [transformed_names.index(column) for column in X_df.columns]
    return explainer, shap_values[:, order]


def global_feature_importance(pipeline, X_df, save_path):
    """Plot mean absolute SHAP value per feature to save_path and return the sorted values."""
    _, shap_values = get_shap_values(pipeline, X_df)
    importance = pd.Series(np.abs(shap_values).mean(axis=0), index=X_df.columns).sort_values()

    fig, ax = plt.subplots(figsize=(9, 0.28 * len(importance) + 1.4), facecolor=SURFACE_COLOR)
    ax.set_facecolor(SURFACE_COLOR)
    ax.barh([_chart_label(column) for column in importance.index], importance.values, height=0.6, color=BAR_COLOR)
    ax.set_title(
        f"Global feature importance across {len(X_df)} customers",
        loc="left", color=PRIMARY_INK, fontsize=13, fontweight="bold",
    )
    ax.set_xlabel("Mean absolute SHAP value (log-odds of churn)", color=SECONDARY_INK)
    ax.margins(y=0.01)
    ax.grid(axis="x", color=GRID_COLOR, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(colors=SECONDARY_INK, length=0)
    for side in ("top", "right", "bottom"):
        ax.spines[side].set_visible(False)
    ax.spines["left"].set_color(BASELINE_COLOR)
    fig.tight_layout()

    save_path = Path(save_path)
    save_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(save_path, dpi=150, facecolor=SURFACE_COLOR)
    plt.close(fig)
    return importance.sort_values(ascending=False)


def explain_customer(pipeline, customer_row_df, feature_names):
    """Return the 3 strongest reasons behind one customer's churn score."""
    if len(customer_row_df) != 1:
        raise ValueError(f"Expected exactly 1 customer row, got {len(customer_row_df)}")
    row_df = customer_row_df[list(feature_names)]
    _, shap_values = get_shap_values(pipeline, row_df)

    # SHAP values are additive, so one-hot columns can be summed back into their original feature
    by_feature = pd.Series(shap_values[0], index=row_df.columns).groupby(_source_feature, sort=False).sum()
    strongest = by_feature.abs().sort_values(ascending=False).index[:TOP_REASONS]

    reasons = []
    for feature in strongest:
        if feature in row_df.columns:
            value = row_df[feature].iloc[0].item()
            subject = _numeric_subject(feature, value)
        else:
            value = _customer_level(feature, row_df)
            subject = _category_subject(feature, value)
        direction = "increases" if by_feature[feature] > 0 else "decreases"
        reasons.append({
            "feature": feature,
            "value": value,
            "direction": direction,
            "reason": f"{subject} {direction} churn risk",
        })
    return reasons


def explain_customer_text(pipeline, customer_row_df, feature_names):
    """Return the top 3 reasons for one customer as a single paragraph."""
    reasons = explain_customer(pipeline, customer_row_df, feature_names)
    return ". ".join(item["reason"] for item in reasons) + "."


def _feature_display_value(feature, row_df):
    """The customer's actual value for a feature, grouping one-hot levels back to their category."""
    if feature in row_df.columns:
        value = row_df[feature].iloc[0].item()
        if feature == "SeniorCitizen":
            return "Yes" if value == 1 else "No"
        return value
    return _customer_level(feature, row_df)


def _scalar_expected_value(expected_value):
    """shap's expected_value is sometimes one float per class; take the positive class's."""
    if isinstance(expected_value, (list, tuple, np.ndarray)):
        values = list(np.ravel(expected_value))
        return float(values[1] if len(values) > 1 else values[0])
    return float(expected_value)


def explain_customer_waterfall(pipeline, customer_row_df, feature_names, top_n=WATERFALL_TOP_FEATURES):
    """Return a full SHAP breakdown for one customer, ready to draw as a waterfall chart.

    Every original feature (one-hot columns summed back into their source feature) gets a
    signed contribution, its display name, and the customer's actual value. Features are
    ranked by the size of their contribution; anything past the top `top_n` is folded into a
    single "Other features" bucket so the chart stays readable. base_value plus every
    contribution (including the folded bucket) equals final_model_output.
    """
    if len(customer_row_df) != 1:
        raise ValueError(f"Expected exactly 1 customer row, got {len(customer_row_df)}")
    row_df = customer_row_df[list(feature_names)]
    explainer, shap_values = get_shap_values(pipeline, row_df)

    base_value = _scalar_expected_value(explainer.expected_value)
    by_feature = pd.Series(shap_values[0], index=row_df.columns).groupby(_source_feature, sort=False).sum()

    features = [
        {
            "feature": feature,
            "label": _label(feature),
            "value": _feature_display_value(feature, row_df),
            "contribution": float(contribution),
        }
        for feature, contribution in by_feature.items()
    ]
    features.sort(key=lambda item: abs(item["contribution"]), reverse=True)

    top_features, remainder = features[:top_n], features[top_n:]
    if remainder:
        top_features.append({
            "feature": "other_features",
            "label": f"Other features ({len(remainder)})",
            "value": None,
            "contribution": float(sum(item["contribution"] for item in remainder)),
        })

    final_model_output = base_value + float(sum(item["contribution"] for item in top_features))
    final_probability = float(pipeline.predict_proba(row_df)[0, 1])

    return {
        "base_value": base_value,
        "features": top_features,
        "final_model_output": final_model_output,
        "final_probability": final_probability,
    }
