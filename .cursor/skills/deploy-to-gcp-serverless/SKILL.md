---
name: deploy-to-gcp-serverless
description: Set up and deploy a web app + API to GCP serverless using embedded skill scripts for Cloud SQL, Secret Manager, Artifact Registry, Cloud Storage, and Cloud Run. Use when the user asks to set up GCP infra, deploy to Cloud Run, run setup-gcp.sh, run deploy.sh, or release API/Web to GCP.
---

# Deploy To GCP Serverless

Use this skill to run the embedded deployment flow in `scripts/setup-gcp.sh` and `scripts/deploy.sh` inside this skill directory.

## APP_NAME convention

Every script derives resource names from a single `APP_NAME` variable:

| Resource             | Naming pattern                          |
|----------------------|-----------------------------------------|
| Artifact Registry    | `${APP_NAME}`                           |
| Cloud SQL instance   | `${APP_NAME}-db`                        |
| Database             | `${APP_NAME}`                           |
| Cloud Run services   | `${APP_NAME}-api`, `${APP_NAME}-web`    |
| Migration job        | `${APP_NAME}-migrate`                   |
| Secrets              | `${APP_NAME}-database-url`, `${APP_NAME}-secret-key` |
| GCS bucket           | `${GCP_PROJECT_ID}-${APP_NAME}-uploads` |

The agent should ask the user for `APP_NAME`; it cannot be inferred from context.

## Preconditions

- `gcloud` is installed and authenticated (`gcloud auth login`).
- `docker` is installed and running.
- User provides `GCP_PROJECT_ID`.
- Run from repository root.

## Workflow

### 1) One-time infrastructure setup

Run:

```bash
GCP_PROJECT_ID=<project-id> APP_NAME=<app-name> bash .cursor/skills/deploy-to-gcp-serverless/scripts/setup-gcp.sh
```

This script is idempotent and creates or verifies:

- Required Google APIs
- Artifact Registry repo
- Cloud SQL instance and database
- Secret Manager secrets
- Cloud Storage bucket for uploads
- IAM grants for Cloud Run runtime access

Capture values printed at the end:

- `CLOUD_SQL_INSTANCE` (connection name)
- `GCS_BUCKET`

### 2) Deploy API and Web

Export env vars and deploy:

```bash
export GCP_PROJECT_ID=<project-id>
export APP_NAME=<app-name>
export CLOUD_SQL_INSTANCE=<project:region:instance>
export GCS_BUCKET=<bucket-name>
bash .cursor/skills/deploy-to-gcp-serverless/scripts/deploy.sh
```

This script:

- Applies **GCS bucket CORS** (via `scripts/ensure-gcs-cors.sh`) so WebGL / Three.js can load textures from `storage.googleapis.com`
- Builds and pushes API and Web images to Artifact Registry
- Runs Alembic migrations through a Cloud Run Job
- Deploys API and Web Cloud Run services
- Updates API `ALLOWED_ORIGINS` with deployed Web URL

CI/CD (`.github/workflows/deploy.yml`) runs the same CORS step on every deploy.

## Verification

After deploy, verify:

```bash
APP_NAME=<app-name>
gcloud run services describe "${APP_NAME}-api" --region="${GCP_REGION:-us-central1}" --format='value(status.url)'
gcloud run services describe "${APP_NAME}-web" --region="${GCP_REGION:-us-central1}" --format='value(status.url)'
```

Then check:

- API docs at `<api-url>/docs`
- Web app loads and can call API

## Troubleshooting CI: `storage.buckets.update` / CORS step

If `scripts/ensure-gcs-cors.sh` fails in GitHub Actions, the WIF deploy service account needs **Storage Admin** on the uploads bucket (bucket-level `roles/storage.admin`).

Re-run **`scripts/setup-github-wif.sh`** (it now grants this), or run once:

```bash
gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
  --member="serviceAccount:github-deploy@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

## Usage Rules For The Agent

- Prefer running the embedded scripts in this skill directory; do not reimplement their logic inline unless the user requests it.
- If `APP_NAME` is not provided, infer it from the git repo directory name. Ask the user to confirm if ambiguous.
- If setup already ran, skip directly to deploy flow.
- If deploy fails, report the failing phase (`build`, `push`, `migrate`, `api deploy`, `web deploy`, or `cors update`) and provide the exact next command to retry.
- Keep region default as `us-central1` unless user overrides `GCP_REGION`.
