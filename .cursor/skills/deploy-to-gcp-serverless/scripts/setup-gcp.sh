#!/usr/bin/env bash
set -euo pipefail

# Idempotent GCP setup: Cloud SQL, database, user, secrets, Artifact Registry, Cloud Storage.
# Safe to run multiple times — skips resources that already exist.
#
# Usage:
#   GCP_PROJECT_ID=al-dev-academy APP_NAME=myapp bash .cursor/skills/deploy-to-gcp-serverless/scripts/setup-gcp.sh
#
# APP_NAME defaults to the git repo directory name if not set.

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
APP_NAME="${APP_NAME:-$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")}"

DB_INSTANCE="${APP_NAME}-db"
DB_NAME="${APP_NAME}"
DB_USER="${APP_NAME}_rw_$(date +%Y%m%d)"
GCS_BUCKET="${GCS_BUCKET:-${PROJECT_ID}-${APP_NAME}-uploads}"

echo "==> Project: ${PROJECT_ID}, Region: ${REGION}, App: ${APP_NAME}"
gcloud config set project "${PROJECT_ID}"

# --- APIs (idempotent — already-enabled APIs are no-ops) ---

echo ""
echo "==> Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com

# --- Artifact Registry ---

echo ""
echo "==> Artifact Registry repo '${APP_NAME}'..."
if [ -n "$(gcloud artifacts repositories list --location="${REGION}" --filter="name~${APP_NAME}$" --format='value(name)')" ]; then
  echo "    Already exists, skipping."
else
  echo "    Creating..."
  gcloud artifacts repositories create "${APP_NAME}" \
    --repository-format=docker \
    --location="${REGION}"
fi

# --- Cloud SQL instance (5-10 min on first run) ---

echo ""
echo "==> Cloud SQL instance '${DB_INSTANCE}'..."
if [ -n "$(gcloud sql instances list --filter="name=${DB_INSTANCE}" --format='value(name)')" ]; then
  echo "    Already exists, skipping."
else
  echo "    Creating (this takes 5-10 minutes)..."
  gcloud sql instances create "${DB_INSTANCE}" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --storage-auto-increase
fi

INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "${DB_INSTANCE}" --format='value(connectionName)')
echo "    Connection: ${INSTANCE_CONNECTION_NAME}"

# --- Cloud Storage bucket for uploads ---

echo ""
echo "==> Cloud Storage bucket '${GCS_BUCKET}'..."
if gcloud storage buckets describe "gs://${GCS_BUCKET}" >/dev/null 2>&1; then
  echo "    Already exists, skipping."
else
  echo "    Creating..."
  gcloud storage buckets create "gs://${GCS_BUCKET}" \
    --location="${REGION}" \
    --uniform-bucket-level-access
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
GCP_PROJECT_ID="${PROJECT_ID}" GCS_BUCKET="${GCS_BUCKET}" \
  bash "${REPO_ROOT}/scripts/ensure-gcs-cors.sh"

# --- Database ---

echo ""
echo "==> Database '${DB_NAME}'..."
if [ -n "$(gcloud sql databases list --instance="${DB_INSTANCE}" --filter="name=${DB_NAME}" --format='value(name)')" ]; then
  echo "    Already exists, skipping."
else
  echo "    Creating..."
  gcloud sql databases create "${DB_NAME}" --instance="${DB_INSTANCE}"
fi

# --- Credentials + Secrets ---
# Only generate new credentials if the secrets don't exist yet.
# If a previous run was interrupted after creating the SQL user but before
# storing secrets, we reset the password so the new secret matches.

SECRET_DB_URL="${APP_NAME}-database-url"
SECRET_KEY="${APP_NAME}-secret-key"

echo ""
echo "==> Secrets..."
if [ -n "$(gcloud secrets list --filter="name~${SECRET_DB_URL}$" --format='value(name)')" ]; then
  echo "    ${SECRET_DB_URL} already exists, skipping credential setup."
  DB_PASS="(stored in Secret Manager)"
else
  DB_PASS="$(openssl rand -hex 16)"
  JWT_SECRET="$(openssl rand -hex 32)"

  echo "    Creating database user '${DB_USER}'..."
  if [ -n "$(gcloud sql users list --instance="${DB_INSTANCE}" --filter="name=${DB_USER}" --format='value(name)')" ]; then
    echo "    User already exists, resetting password to match new secret..."
    gcloud sql users set-password "${DB_USER}" \
      --instance="${DB_INSTANCE}" --password="${DB_PASS}"
  else
    gcloud sql users create "${DB_USER}" \
      --instance="${DB_INSTANCE}" --password="${DB_PASS}"
  fi

  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@/${DB_NAME}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"

  echo "    Storing ${SECRET_DB_URL}..."
  echo -n "${DATABASE_URL}" | gcloud secrets create "${SECRET_DB_URL}" --data-file=-

  echo "    Storing ${SECRET_KEY}..."
  echo -n "${JWT_SECRET}" | gcloud secrets create "${SECRET_KEY}" --data-file=-
fi

# --- IAM bindings (idempotent — adding the same binding twice is a no-op) ---

echo ""
echo "==> IAM: granting Cloud Run access to secrets, Cloud SQL, and Cloud Storage..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "    Service account: ${COMPUTE_SA}"

gcloud secrets add-iam-policy-binding "${SECRET_DB_URL}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor" --quiet
echo "    ${SECRET_DB_URL}: granted"

gcloud secrets add-iam-policy-binding "${SECRET_KEY}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor" --quiet
echo "    ${SECRET_KEY}: granted"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/cloudsql.client" --quiet >/dev/null
echo "    roles/cloudsql.client: granted"

gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/storage.objectAdmin" --quiet >/dev/null
echo "    ${GCS_BUCKET}: roles/storage.objectAdmin granted to Cloud Run runtime SA"

gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
  --member="allUsers" \
  --role="roles/storage.objectViewer" --quiet >/dev/null
echo "    ${GCS_BUCKET}: roles/storage.objectViewer granted to allUsers (public image reads)"

GITHUB_DEPLOY_SA="github-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "${GITHUB_DEPLOY_SA}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
    --member="serviceAccount:${GITHUB_DEPLOY_SA}" \
    --role="roles/storage.admin" \
    --quiet >/dev/null
  echo "    ${GCS_BUCKET}: roles/storage.admin for ${GITHUB_DEPLOY_SA} (CI CORS)"
else
  echo "    (github-deploy SA not found — after scripts/setup-github-wif.sh, re-run this script or grant roles/storage.admin on the bucket to the deploy SA)"
fi

# --- Summary ---

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo "  App name:            ${APP_NAME}"
echo "  Cloud SQL instance:  ${INSTANCE_CONNECTION_NAME}"
echo "  Database:            ${DB_NAME}"
echo "  User:                ${DB_USER}"
echo "  Password:            ${DB_PASS}"
echo "  GCS bucket:          ${GCS_BUCKET}"
echo ""
echo "  Now deploy:"
echo "    export GCP_PROJECT_ID=${PROJECT_ID}"
echo "    export APP_NAME=${APP_NAME}"
echo "    export CLOUD_SQL_INSTANCE=${INSTANCE_CONNECTION_NAME}"
echo "    export GCS_BUCKET=${GCS_BUCKET}"
echo "    bash .cursor/skills/deploy-to-gcp-serverless/scripts/deploy.sh"
