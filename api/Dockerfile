FROM python:3.11-slim

WORKDIR /app

# libgomp1 is the OpenMP runtime LightGBM's and XGBoost's compiled extensions need;
# python:3.11-slim does not include it.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install only the serving dependencies (no Optuna, MLflow, or notebook/plotting packages).
COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

# src/ holds the shared model, explain, and retention logic the API imports at startup.
COPY src ./src
# models/ holds the trained pipeline and its metrics, read at startup.
COPY models ./models
# data/raw/ holds the Telco customer CSV the API scores and serves from.
COPY data/raw ./data/raw
COPY api ./api

ENV PORT=5053
EXPOSE 5053

WORKDIR /app/api

# One worker with a few threads fits a 512MB free-tier instance; gthread shares memory
# across threads instead of forking a full Python + model copy per worker.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --worker-class gthread --workers 1 --threads 4 --timeout 120 app:app"]
