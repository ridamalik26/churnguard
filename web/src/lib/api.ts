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

export type HealthStatus = {
  status: string;
  timestamp: string;
};

export type ProbabilityBucket = {
  range: string;
  count: number;
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
  gender: string;
  senior_citizen: boolean;
  partner: string;
  dependents: string;
};

export type MetricKey = "roc_auc" | "pr_auc" | "precision" | "recall" | "f1";

export type MetricSet = Record<MetricKey, number>;

export type ConfusionMatrix = {
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
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
