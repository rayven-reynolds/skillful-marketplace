#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------
# Deploy app to GCP Cloud Run
#
# Prerequisites:
#   Run the one-time setup first (creates Cloud SQL, secrets, etc.):
#     GCP_PROJECT_ID=<your-project> APP_NAME=<app> bash .cursor/skills/deploy-to-gcp-serverless/scripts/setup-gcp.sh
#
# Usage:
#   export GCP_PROJECT_ID=<your-project>
#   export APP_NAME=<app>                         (defaults to git repo dir name)
#   export CLOUD_SQL_INSTANCE=<project:region:instance>  (printed by setup-gcp.sh)
#   export GCS_BUCKET=<bucket-name>               (printed by setup-gcp.sh)
#   bash .cursor/skills/deploy-to-gcp-serverless/scripts/deploy.sh
# -----------------------------------------------------------------

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
APP_NAME="${APP_NAME:-$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")}"

API_SERVICE="${APP_NAME}-api"
WEB_SERVICE="${APP_NAME}-web"
MIGRATE_JOB="${APP_NAME}-migrate"
REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}"
DB_INSTANCE="${CLOUD_SQL_INSTANCE:?Set CLOUD_SQL_INSTANCE (project:region:instance)}"
GCS_BUCKET="${GCS_BUCKET:-${PROJECT_ID}-${APP_NAME}-uploads}"
SECRET_DB_URL="${APP_NAME}-database-url"
SECRET_KEY="${APP_NAME}-secret-key"

TAG="$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

get_all_urls() {
  local svc="$1"
  gcloud run services describe "${svc}" --region="${REGION}" \
    --format='value(metadata.annotations["run.googleapis.com/urls"])' 2>/dev/null \
    | tr -d '[]"' | tr ',' '\n' | paste -sd ',' -
}

echo "==> Deploying ${APP_NAME} (tag=${TAG})..."
echo "==> Configuring Docker auth..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
GCP_PROJECT_ID="${PROJECT_ID}" GCS_BUCKET="${GCS_BUCKET}" \
  bash "${REPO_ROOT}/scripts/ensure-gcs-cors.sh"

# Fetch all current web service URLs so we can preserve CORS during deploy.
# On the very first deploy this will be empty (the web service doesn't exist yet).
EXISTING_WEB_URLS=$(get_all_urls "${WEB_SERVICE}" || true)
ALLOWED_ORIGINS="${EXISTING_WEB_URLS:+${EXISTING_WEB_URLS},}http://localhost:3000,http://localhost:9293"

# --- Phase 1: Build and deploy API ---

echo "==> Building API image..."
docker build --platform linux/amd64 -t "${REPO}/api:${TAG}" -t "${REPO}/api:latest" ./api

echo "==> Pushing API image..."
docker push "${REPO}/api:${TAG}"
docker push "${REPO}/api:latest"

echo "==> Deploying migration job definition..."
gcloud run jobs deploy "${MIGRATE_JOB}" \
  --image="${REPO}/api:${TAG}" \
  --region="${REGION}" \
  --set-cloudsql-instances="${DB_INSTANCE}" \
  --set-secrets="DATABASE_URL=${SECRET_DB_URL}:latest,SECRET_KEY=${SECRET_KEY}:latest" \
  --command="alembic" \
  --args="upgrade,head" \
  --memory=512Mi \
  --max-retries=0

echo "==> Running migrations..."
gcloud run jobs execute "${MIGRATE_JOB}" --wait --region="${REGION}"

echo "==> Deploying API to Cloud Run..."
gcloud run deploy "${API_SERVICE}" \
  --image="${REPO}/api:${TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances="${DB_INSTANCE}" \
  --set-env-vars="^||^STORAGE_BACKEND=gcs||GCS_BUCKET=${GCS_BUCKET}||ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --set-secrets="DATABASE_URL=${SECRET_DB_URL}:latest,SECRET_KEY=${SECRET_KEY}:latest" \
  --port=8000 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=3

API_URL=$(gcloud run services describe "${API_SERVICE}" --region="${REGION}" --format='value(status.url)')
echo "    API deployed: ${API_URL}"

# --- Phase 2: Build web with the real API URL baked in, then deploy ---

echo "==> Building Web image (NEXT_PUBLIC_API_URL=${API_URL})..."
docker build --platform linux/amd64 \
  -t "${REPO}/web:${TAG}" \
  -t "${REPO}/web:latest" \
  --build-arg "NEXT_PUBLIC_API_URL=${API_URL}" \
  ./web

echo "==> Pushing Web image..."
docker push "${REPO}/web:${TAG}"
docker push "${REPO}/web:latest"

echo "==> Deploying Web to Cloud Run..."
gcloud run deploy "${WEB_SERVICE}" \
  --image="${REPO}/web:${TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=3

WEB_URL=$(gcloud run services describe "${WEB_SERVICE}" --region="${REGION}" --format='value(status.url)')

# --- Phase 3: Update API CORS with ALL web service URLs ---
# Cloud Run exposes both legacy and new URL formats; include all of them.

ALL_WEB_URLS=$(get_all_urls "${WEB_SERVICE}")
ALLOWED_ORIGINS="${ALL_WEB_URLS},http://localhost:3000,http://localhost:9293"
echo "==> Updating API CORS (ALLOWED_ORIGINS=${ALLOWED_ORIGINS})..."
gcloud run services update "${API_SERVICE}" \
  --region="${REGION}" \
  --update-env-vars "^||^ALLOWED_ORIGINS=${ALLOWED_ORIGINS}"

echo ""
echo "==> Done!"
echo "    API:  ${API_URL}"
echo "    Web:  ${WEB_URL}"
echo "    Docs: ${API_URL}/docs"
