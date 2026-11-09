export type RiskLevel = "high" | "medium" | "low";

export type AtRiskCustomer = {
  customerID: string;
  monthly_charges: number;
  churn_probability: number;
  risk_level: RiskLevel;
  top_reasons: string[];
};

export type RetentionMessage = {
  subject: string;
  body: string;
};

export type RetentionOffer = {
  id: string;
  name: string;
  description: string;
  cost: number;
  hypothetical_new_probability: number | null;
  estimated_expected_value: number | null;
};

export type RetentionSource = "groq" | "fallback_template";

export type RetentionRecommendationContent = {
  summary: string;
  main_drivers: string[];
  recommended_offer_id: string;
  strategy: string;
  communication_channel: string;
  tone: string;
  email_subject: string;
  email_body: string;
};

export type RetentionRecommendationResult = {
  customer_id: string;
  churn_probability: number;
  risk_level: RiskLevel;
  top_drivers: string[];
  eligible_offers: RetentionOffer[];
  recommendation: RetentionRecommendationContent;
  source: RetentionSource;
};

export type RetentionHistoryEntry = {
  customer_id: string;
  timestamp: string;
  offer_id: string;
  source: RetentionSource;
  payload: RetentionRecommendationResult;
};

export type RetentionHistory = {
  total: number;
  recent: RetentionHistoryEntry[];
};

export type HealthStatus = {
  status: string;
  timestamp: string;
};

export type ProbabilityBucket = {
  range: string;
  count: number;
};

export type GlobalShapFeature = {
  feature: string;
  label: string;
  importance: number;
  share: number;
};

export type CustomerSummary = {
  total_customers: number;
  risk_counts: Record<RiskLevel, number>;
  avg_churn_probability: number;
  revenue_at_risk: number;
  probability_distribution: ProbabilityBucket[];
};

export type CustomerDetail = AtRiskCustomer & {
  total_charges: number;
  tenure: number;
  contract: string;
  payment_method: string;
  paperless_billing: string;
  internet_service: string;
  phone_service: string;
  tech_support: string;
  online_security: string;
  gender: string;
  senior_citizen: boolean;
  partner: string;
  dependents: string;
};

export type ShapFeatureContribution = {
  feature: string;
  label: string;
  value: string | number | boolean | null;
  contribution: number;
};

export type ShapWaterfall = {
  base_value: number;
  features: ShapFeatureContribution[];
  final_model_output: number;
  final_probability: number;
};

export type SimulationOverrides = {
  Contract?: string;
  tenure?: number;
  MonthlyCharges?: number;
  InternetService?: string;
  PaymentMethod?: string;
  PaperlessBilling?: string;
  TechSupport?: string;
  OnlineSecurity?: string;
};

export type SimulationResult = {
  customer_id: string;
  overrides_applied: SimulationOverrides;
  original_probability: number;
  new_probability: number;
  probability_change: number;
  new_risk_level: RiskLevel;
  new_top_reasons: string[];
};

export type MetricKey = "roc_auc" | "pr_auc" | "precision" | "recall" | "f1";

export type MetricSet = Record<MetricKey, number>;

export type ConfusionMatrix = {
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
};

export type ModelComparisonEntry = MetricSet & {
  fit_time_seconds: number;
  predict_time_seconds_per_row: number;
};

export type ModelComparison = Record<string, ModelComparisonEntry>;

export type CalibrationCurvePoint = {
  mean_predicted: number;
  fraction_positive: number;
};

export type CalibrationMethod = "uncalibrated" | "isotonic" | "sigmoid";

export type CalibrationEntry = {
  brier_score: Record<CalibrationMethod, number>;
  curves: Record<CalibrationMethod, CalibrationCurvePoint[]>;
  best_method: CalibrationMethod;
};

export type Calibration = Record<string, CalibrationEntry>;

export type ThresholdCurvePoint = {
  threshold: number;
  expected_savings: number;
};

export type BusinessThresholdConfig = {
  cost_of_contact: number;
  cost_of_retention_offer: number;
  revenue_lost_per_churn: number;
  offer_success_rate: number;
};

export type BusinessThreshold = {
  config: BusinessThresholdConfig;
  f1_threshold: number;
  business_threshold: number;
  curve: ThresholdCurvePoint[];
  expected_savings_validation: number;
  expected_savings_test_at_f1_threshold: number;
  expected_savings_test_at_business_threshold: number;
};

export type SelectedModel = {
  name: string;
  rule: string;
  tuned_params: Record<string, number | string>;
  cv_pr_auc: number;
  cv_roc_auc: number;
  calibration_best_method: CalibrationMethod;
  calibration_best_brier: number;
  test_metrics_at_f1_threshold: MetricSet;
  test_metrics_at_business_threshold: MetricSet;
  test_confusion_matrix_at_f1_threshold: ConfusionMatrix;
  note: string;
};

export type ModelMetrics = {
  threshold: number;
  xgboost_test_default_threshold: MetricSet;
  xgboost_test_tuned_threshold: MetricSet;
  xgboost_test_tuned_confusion_matrix: ConfusionMatrix;
  logistic_regression_test: MetricSet;
  cv_mean_roc_auc: {
    logistic_regression: number;
    xgboost: number;
  };
  model_comparison: ModelComparison;
  calibration: Calibration;
  business_threshold: BusinessThreshold;
  selected_model: SelectedModel;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 30000;

function errorFromBody(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not set. Add it to web/.env.local and restart the app.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new Error(`Could not reach the API at ${API_URL}. Check that it is running and try again.`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`The server at ${API_URL} did not return JSON. Check that NEXT_PUBLIC_API_URL points to the ChurnGuard API.`);
  }

  if (!response.ok) {
    throw new Error(errorFromBody(body) ?? `The request failed with status ${response.status}.`);
  }
  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
