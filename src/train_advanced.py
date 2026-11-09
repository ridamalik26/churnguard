"""Benchmarks, tunes, calibrates, and selects the churn model.

Replaces the single-model flow in notebooks/eda_and_train.ipynb with a documented comparison
across four algorithms. The preprocessing (StandardScaler on the 3 numeric columns, one-hot
columns passed through) and the 70/15/15 stratified train/val/test split are unchanged from the
notebook, so the saved pipeline.joblib stays compatible with api/app.py and src/explain.py.

All cross-validation and tuning is fit only on X_train (never on X_val or X_test), so no
preprocessing statistic (the StandardScaler mean/std included) ever sees validation or test
rows before they are scored.

Run with: python src/train_advanced.py
Writes: models/pipeline.joblib, models/metrics.json, and MLflow runs under mlruns/.
"""
import json
import os
import time
from pathlib import Path

# The local filesystem store is in maintenance mode in MLflow 3.x; this task explicitly asks
# for a local file store at mlruns/, so opt back in rather than migrating to a database backend.
os.environ.setdefault("MLFLOW_ALLOW_FILE_STORE", "true")

import joblib
import lightgbm as lgb
import mlflow
import mlflow.sklearn
import numpy as np
import optuna
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "raw" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
MODELS_DIR = ROOT / "models"
MLRUNS_DIR = ROOT / "mlruns"
BUSINESS_CONFIG_PATH = Path(__file__).resolve().parent / "business_config.json"
MLFLOW_EXPERIMENT = "churnguard"
REGISTERED_MODEL_NAME = "churnguard-model"
# mlflow.sklearn.log_model's skops serializer refuses to load back types it does not
# recognize as safe by default; explicitly trust the model classes this script can produce.
SKOPS_TRUSTED_TYPES = [
    "collections.OrderedDict",
    "lightgbm.basic.Booster",
    "lightgbm.sklearn.LGBMClassifier",
    "xgboost.sklearn.XGBClassifier",
    "xgboost.core.Booster",
    "sklearn.ensemble._forest.RandomForestClassifier",
    "sklearn.linear_model._logistic.LogisticRegression",
]

RANDOM_STATE = 42
HOLDOUT_SIZE = 0.30
TEST_SHARE_OF_HOLDOUT = 0.50
CV_FOLDS = 5
OPTUNA_TRIALS = 50
NUM_COLS = ["tenure", "MonthlyCharges", "TotalCharges"]
DEFAULT_THRESHOLD = 0.5
BUSINESS_THRESHOLD_RANGE = [round(t, 2) for t in np.arange(0.05, 0.951, 0.01)]
# Two models count as tied on PR-AUC if they are within this much of each other.
TIE_BREAK_PR_AUC_TOLERANCE = 0.005

MODEL_NAMES = ["logistic_regression", "random_forest", "xgboost", "lightgbm"]


# ---------------------------------------------------------------------------
# Data and preprocessing (identical to notebooks/eda_and_train.ipynb)
# ---------------------------------------------------------------------------


def load_clean_data():
    """Drop rows with no TotalCharges, drop customerID, one-hot encode categoricals."""
    data = pd.read_csv(DATA_PATH)
    data["TotalCharges"] = pd.to_numeric(data["TotalCharges"].replace(r"^\s*$", np.nan, regex=True), errors="coerce")
    data = data.dropna(subset=["TotalCharges"]).drop(columns=["customerID"])
    data["Churn"] = (data["Churn"] == "Yes").astype(int)
    cat_cols = data.select_dtypes(exclude="number").columns.tolist()
    data = pd.get_dummies(data, columns=cat_cols, drop_first=True, dtype=int)
    return data.drop(columns="Churn"), data["Churn"]


def make_preprocessor():
    """Scale the 3 numeric columns; one-hot columns pass through. Fit only on the training fold."""
    return ColumnTransformer([("num", StandardScaler(), NUM_COLS)], remainder="passthrough")


def build_model(name, spw, params=None):
    params = dict(params or {})
    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", max_iter=2000, random_state=RANDOM_STATE, **params)
    if name == "random_forest":
        return RandomForestClassifier(class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1, **params)
    if name == "xgboost":
        return XGBClassifier(scale_pos_weight=spw, eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1, **params)
    if name == "lightgbm":
        return lgb.LGBMClassifier(scale_pos_weight=spw, random_state=RANDOM_STATE, n_jobs=-1, verbosity=-1, **params)
    raise ValueError(f"Unknown model name: {name!r}")


def make_pipeline(model):
    return Pipeline([("preprocessor", make_preprocessor()), ("model", model)])


def metrics_at(y_true, proba, threshold=DEFAULT_THRESHOLD):
    pred = (proba >= threshold).astype(int)
    return {
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "pr_auc": float(average_precision_score(y_true, proba)),
        "precision": float(precision_score(y_true, pred, zero_division=0)),
        "recall": float(recall_score(y_true, pred, zero_division=0)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
    }


# ---------------------------------------------------------------------------
# Step 1: benchmark all 4 models with stratified 5-fold CV on the training set
# ---------------------------------------------------------------------------


def cross_validate_model(name, X_train, y_train, spw, params=None):
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    fold_metrics, fit_times, predict_times = [], [], []

    for train_idx, val_idx in cv.split(X_train, y_train):
        pipe = make_pipeline(build_model(name, spw, params))

        start = time.perf_counter()
        pipe.fit(X_train.iloc[train_idx], y_train.iloc[train_idx])
        fit_times.append(time.perf_counter() - start)

        X_fold_val = X_train.iloc[val_idx]
        start = time.perf_counter()
        proba = pipe.predict_proba(X_fold_val)[:, 1]
        predict_times.append((time.perf_counter() - start) / len(X_fold_val))

        fold_metrics.append(metrics_at(y_train.iloc[val_idx], proba))

    averaged = {key: float(np.mean([m[key] for m in fold_metrics])) for key in fold_metrics[0]}
    averaged["fit_time_seconds"] = float(np.mean(fit_times))
    averaged["predict_time_seconds_per_row"] = float(np.mean(predict_times))
    return averaged


# ---------------------------------------------------------------------------
# Step 2: tune the top 2 models with Optuna, optimizing mean CV PR-AUC
# ---------------------------------------------------------------------------


def search_space(trial, name):
    if name == "logistic_regression":
        return {"C": trial.suggest_float("C", 1e-3, 1e2, log=True)}
    if name == "random_forest":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "max_depth": trial.suggest_int("max_depth", 3, 20),
            "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 20),
            "max_features": trial.suggest_float("max_features", 0.3, 1.0),
        }
    if name == "xgboost":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "max_depth": trial.suggest_int("max_depth", 2, 10),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        }
    if name == "lightgbm":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "num_leaves": trial.suggest_int("num_leaves", 8, 128),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "min_child_samples": trial.suggest_int("min_child_samples", 5, 50),
        }
    raise ValueError(f"Unknown model name: {name!r}")


def tune_model(name, X_train, y_train, spw, n_trials=OPTUNA_TRIALS):
    """Maximize mean 5-fold CV PR-AUC on the training set only, with a fixed seed."""
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    splits = list(cv.split(X_train, y_train))

    def objective(trial):
        params = search_space(trial, name)
        scores = []
        for train_idx, val_idx in splits:
            pipe = make_pipeline(build_model(name, spw, params))
            pipe.fit(X_train.iloc[train_idx], y_train.iloc[train_idx])
            proba = pipe.predict_proba(X_train.iloc[val_idx])[:, 1]
            scores.append(average_precision_score(y_train.iloc[val_idx], proba))
        return float(np.mean(scores))

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=RANDOM_STATE))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    return study.best_params, float(study.best_value)


# ---------------------------------------------------------------------------
# Step 3: calibration comparison on the held-out validation split
# ---------------------------------------------------------------------------


def calibration_curve_points(y_true, proba, n_bins=10):
    frac_pos, mean_pred = calibration_curve(y_true, proba, n_bins=n_bins, strategy="quantile")
    return [{"mean_predicted": float(p), "fraction_positive": float(f)} for p, f in zip(mean_pred, frac_pos)]


def calibration_comparison(name, best_params, X_train, y_train, X_val, y_val, spw):
    """Compare uncalibrated vs isotonic vs sigmoid calibration. Brier score and curves are
    computed on X_val, which none of the three fits ever train on: the uncalibrated and base
    estimators for calibration are fit on X_train only, and CalibratedClassifierCV's internal
    cross-fitting also stays within X_train.
    """
    brier_scores, curves = {}, {}

    uncalibrated = make_pipeline(build_model(name, spw, best_params))
    uncalibrated.fit(X_train, y_train)
    uncalibrated_proba = uncalibrated.predict_proba(X_val)[:, 1]
    brier_scores["uncalibrated"] = float(brier_score_loss(y_val, uncalibrated_proba))
    curves["uncalibrated"] = calibration_curve_points(y_val, uncalibrated_proba)

    for method in ("isotonic", "sigmoid"):
        calibrated = CalibratedClassifierCV(
            make_pipeline(build_model(name, spw, best_params)), method=method, cv=CV_FOLDS
        )
        calibrated.fit(X_train, y_train)
        proba = calibrated.predict_proba(X_val)[:, 1]
        brier_scores[method] = float(brier_score_loss(y_val, proba))
        curves[method] = calibration_curve_points(y_val, proba)

    return brier_scores, curves


# ---------------------------------------------------------------------------
# Step 4: business-cost threshold optimization
# ---------------------------------------------------------------------------


def expected_savings_at(y_true, proba, threshold, config):
    """Expected net savings from contacting every customer predicted at risk at this threshold.

    A contacted customer always costs cost_of_contact, plus cost_of_retention_offer with
    probability offer_success_rate (the offer is only taken, and only then costs anything,
    that fraction of the time). A true positive additionally saves offer_success_rate *
    revenue_lost_per_churn in expectation, since that is the chance the offer retains them.
    A false positive has no churn to prevent, so it is pure cost.
    """
    cost_contact = config["cost_of_contact"]
    cost_offer = config["cost_of_retention_offer"]
    revenue_lost = config["revenue_lost_per_churn"]
    success_rate = config["offer_success_rate"]

    contact_cost = cost_contact + success_rate * cost_offer
    true_positive_value = success_rate * revenue_lost - contact_cost
    false_positive_value = -contact_cost

    pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
    return float(tp * true_positive_value + fp * false_positive_value)


def business_threshold_curve(y_true, proba, config):
    curve = [
        {"threshold": threshold, "expected_savings": expected_savings_at(y_true, proba, threshold, config)}
        for threshold in BUSINESS_THRESHOLD_RANGE
    ]
    best = max(curve, key=lambda row: row["expected_savings"])
    return best["threshold"], best["expected_savings"], curve


def f1_optimal_threshold(y_true, proba):
    precision, recall, thresholds = precision_recall_curve(y_true, proba)
    f1s = 2 * precision[:-1] * recall[:-1] / np.clip(precision[:-1] + recall[:-1], 1e-12, None)
    return float(thresholds[np.argmax(f1s)])


# ---------------------------------------------------------------------------
# Step 6: final model selection
# ---------------------------------------------------------------------------

SELECTION_RULE = (
    "Highest cross-validated PR-AUC among the Optuna-tuned finalists; if the two finalists are "
    f"within {TIE_BREAK_PR_AUC_TOLERANCE} PR-AUC of each other, the tie is broken by whichever has "
    "the lower best calibrated Brier score on the validation split."
)


def select_final_model(tuned_cv_metrics, calibration):
    ranked = sorted(tuned_cv_metrics.items(), key=lambda kv: kv[1]["pr_auc"], reverse=True)
    best_name = ranked[0][0]
    if len(ranked) > 1:
        second_name = ranked[1][0]
        pr_auc_gap = abs(ranked[0][1]["pr_auc"] - ranked[1][1]["pr_auc"])
        if pr_auc_gap <= TIE_BREAK_PR_AUC_TOLERANCE:
            best_brier = min(calibration[best_name]["brier_score"].values())
            second_brier = min(calibration[second_name]["brier_score"].values())
            if second_brier < best_brier:
                best_name = second_name
    return best_name


def _log_dict_artifact(name, payload):
    mlflow.log_dict(payload, name)


def main():
    MLRUNS_DIR.mkdir(parents=True, exist_ok=True)
    mlflow.set_tracking_uri(MLRUNS_DIR.resolve().as_uri())
    mlflow.set_experiment(MLFLOW_EXPERIMENT)

    X, y = load_clean_data()
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=HOLDOUT_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=TEST_SHARE_OF_HOLDOUT, stratify=y_temp, random_state=RANDOM_STATE
    )
    spw = (y_train == 0).sum() / (y_train == 1).sum()
    print(f"train={len(X_train)} val={len(X_val)} test={len(X_test)} churn_rate_train={y_train.mean():.4f}")

    # Step 1: benchmark all 4 models
    model_comparison = {}
    for name in MODEL_NAMES:
        with mlflow.start_run(run_name=f"benchmark-{name}"):
            result = cross_validate_model(name, X_train, y_train, spw)
            mlflow.log_param("model", name)
            mlflow.log_param("stage", "benchmark")
            mlflow.log_metrics(result)
            model_comparison[name] = result
        print(f"[benchmark] {name}: " + ", ".join(f"{k}={v:.4f}" for k, v in result.items()))

    # Step 2: tune the top 2 models by CV PR-AUC
    ranked_by_pr_auc = sorted(model_comparison.items(), key=lambda kv: kv[1]["pr_auc"], reverse=True)
    top_two = [name for name, _ in ranked_by_pr_auc[:2]]
    print(f"Tuning top 2 models by baseline CV PR-AUC: {top_two}")

    tuned_params = {}
    tuned_cv_metrics = {}
    for name in top_two:
        with mlflow.start_run(run_name=f"tune-{name}"):
            best_params, best_pr_auc = tune_model(name, X_train, y_train, spw)
            cv_metrics = cross_validate_model(name, X_train, y_train, spw, params=best_params)
            mlflow.log_param("model", name)
            mlflow.log_param("stage", "tune")
            for key, value in best_params.items():
                mlflow.log_param(f"param_{key}", value)
            mlflow.log_metrics(cv_metrics)
            tuned_params[name] = best_params
            tuned_cv_metrics[name] = cv_metrics
        print(f"[tuned] {name}: pr_auc={cv_metrics['pr_auc']:.4f} params={best_params}")

    # Step 3: calibration comparison for each tuned finalist, on the held-out validation split
    calibration = {}
    for name in top_two:
        with mlflow.start_run(run_name=f"calibrate-{name}"):
            brier_scores, curves = calibration_comparison(
                name, tuned_params[name], X_train, y_train, X_val, y_val, spw
            )
            mlflow.log_param("model", name)
            mlflow.log_param("stage", "calibrate")
            mlflow.log_metrics({f"brier_{method}": value for method, value in brier_scores.items()})
            for method, points in curves.items():
                _log_dict_artifact(f"calibration_{method}.json", points)
            calibration[name] = {
                "brier_score": brier_scores,
                "curves": curves,
                "best_method": min(brier_scores, key=brier_scores.get),
            }
        print(f"[calibration] {name}: brier={brier_scores}")

    # Step 6: select the final model
    best_name = select_final_model(tuned_cv_metrics, calibration)
    print(f"Selected model: {best_name}. Rule: {SELECTION_RULE}")

    # Refit the selected model on the full training set, then evaluate once on the untouched test set
    final_pipe = make_pipeline(build_model(best_name, spw, tuned_params[best_name]))
    final_pipe.fit(X_train, y_train)

    val_proba = final_pipe.predict_proba(X_val)[:, 1]
    test_proba = final_pipe.predict_proba(X_test)[:, 1]

    f1_threshold = f1_optimal_threshold(y_val, val_proba)
    business_config = json.loads(BUSINESS_CONFIG_PATH.read_text(encoding="utf-8"))
    business_threshold, business_savings_val, threshold_curve = business_threshold_curve(
        y_val, val_proba, business_config
    )

    default_metrics_test = metrics_at(y_test, test_proba, DEFAULT_THRESHOLD)
    f1_metrics_test = metrics_at(y_test, test_proba, f1_threshold)
    business_metrics_test = metrics_at(y_test, test_proba, business_threshold)

    tn, fp, fn, tp = confusion_matrix(y_test, (test_proba >= f1_threshold).astype(int)).ravel()
    f1_confusion_test = {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)}

    business_savings_test = expected_savings_at(y_test, test_proba, business_threshold, business_config)
    f1_savings_test = expected_savings_at(y_test, test_proba, f1_threshold, business_config)

    # A plain, untuned logistic regression baseline evaluated once on the test set, so the
    # logistic_regression_test key stays a real logistic regression result either way
    lr_baseline = make_pipeline(build_model("logistic_regression", spw))
    lr_baseline.fit(X_train, y_train)
    lr_test_metrics = metrics_at(y_test, lr_baseline.predict_proba(X_test)[:, 1], DEFAULT_THRESHOLD)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_pipe, MODELS_DIR / "pipeline.joblib")

    with mlflow.start_run(run_name=f"final-{best_name}"):
        mlflow.log_param("model", best_name)
        mlflow.log_param("stage", "final")
        for key, value in tuned_params[best_name].items():
            mlflow.log_param(f"param_{key}", value)
        mlflow.log_metrics({
            "cv_pr_auc": tuned_cv_metrics[best_name]["pr_auc"],
            "cv_roc_auc": tuned_cv_metrics[best_name]["roc_auc"],
            "test_roc_auc": f1_metrics_test["roc_auc"],
            "test_pr_auc": f1_metrics_test["pr_auc"],
            "test_f1_at_f1_threshold": f1_metrics_test["f1"],
            "test_f1_at_business_threshold": business_metrics_test["f1"],
            "f1_threshold": f1_threshold,
            "business_threshold": business_threshold,
            "expected_savings_test_at_f1_threshold": f1_savings_test,
            "expected_savings_test_at_business_threshold": business_savings_test,
        })
        _log_dict_artifact("business_config.json", business_config)
        _log_dict_artifact("threshold_curve.json", threshold_curve)
        mlflow.sklearn.log_model(
            final_pipe,
            artifact_path="model",
            registered_model_name=REGISTERED_MODEL_NAME,
            skops_trusted_types=SKOPS_TRUSTED_TYPES,
        )

    out = {
        "threshold": f1_threshold,
        "feature_columns": X.columns.tolist(),
        "xgboost_test_default_threshold": default_metrics_test,
        "xgboost_test_tuned_threshold": f1_metrics_test,
        "xgboost_test_tuned_confusion_matrix": f1_confusion_test,
        "logistic_regression_test": lr_test_metrics,
        "cv_mean_roc_auc": {
            "logistic_regression": model_comparison["logistic_regression"]["roc_auc"],
            "xgboost": tuned_cv_metrics[best_name]["roc_auc"],
        },
        "model_comparison": model_comparison,
        "calibration": calibration,
        "business_threshold": {
            "config": business_config,
            "f1_threshold": f1_threshold,
            "business_threshold": business_threshold,
            "curve": threshold_curve,
            "expected_savings_validation": business_savings_val,
            "expected_savings_test_at_f1_threshold": f1_savings_test,
            "expected_savings_test_at_business_threshold": business_savings_test,
        },
        "selected_model": {
            "name": best_name,
            "rule": SELECTION_RULE,
            "tuned_params": tuned_params[best_name],
            "cv_pr_auc": tuned_cv_metrics[best_name]["pr_auc"],
            "cv_roc_auc": tuned_cv_metrics[best_name]["roc_auc"],
            "calibration_best_method": calibration[best_name]["best_method"],
            "calibration_best_brier": min(calibration[best_name]["brier_score"].values()),
            "test_metrics_at_f1_threshold": f1_metrics_test,
            "test_metrics_at_business_threshold": business_metrics_test,
            "test_confusion_matrix_at_f1_threshold": f1_confusion_test,
            "note": (
                "Deployed uncalibrated: calibration is evaluated above for transparency, but the "
                "shipped pipeline keeps raw probabilities so src/explain.py can use TreeExplainer "
                "or LinearExplainer directly on the model step."
            ),
        },
    }
    (MODELS_DIR / "metrics.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Saved {MODELS_DIR / 'pipeline.joblib'} and {MODELS_DIR / 'metrics.json'}")


if __name__ == "__main__":
    main()
