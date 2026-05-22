# GCP Deployment Guide — Jewelry CRM

Complete step-by-step instructions for deploying the Django + Next.js Jewelry CRM to Google Cloud Platform using Cloud Run, Cloud SQL, Cloud Storage, and Cloud Build.

---

## Prerequisites

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- Docker installed locally (for testing images)
- Access to a GCP billing account

---

## 1. Create GCP Project

```bash
# Create project
gcloud projects create jewelry-crm-prod --name="Jewelry CRM Production"

# Set as active project
gcloud config set project jewelry-crm-prod

# Link billing account (replace BILLING_ACCOUNT_ID)
gcloud billing projects link jewelry-crm-prod \
  --billing-account=BILLING_ACCOUNT_ID
```

---

## 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  storage-component.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com
```

---

## 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create jewelry-crm \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Jewelry CRM Docker images"
```

Authenticate Docker to push images:

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

---

## 4. Create Cloud SQL (PostgreSQL) Instance

```bash
# Create instance (~5 minutes)
gcloud sql instances create jewelry-crm-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00 \
  --require-ssl

# Create database
gcloud sql databases create jewelry_crm \
  --instance=jewelry-crm-db

# Create database user (generates a random password — save it)
gcloud sql users create jewelry_user \
  --instance=jewelry-crm-db \
  --password=$(openssl rand -base64 24)
```

Note the **Connection name**: `jewelry-crm-prod:asia-south1:jewelry-crm-db` — used in DB_HOST.

---

## 5. Create Cloud Storage Bucket for Media Files

```bash
PROJECT_ID=jewelry-crm-prod
BUCKET_NAME=${PROJECT_ID}-media

# Create bucket in Mumbai region
gcloud storage buckets create gs://${BUCKET_NAME} \
  --location=asia-south1 \
  --uniform-bucket-level-access

# Make bucket publicly readable (for media file serving)
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member=allUsers \
  --role=roles/storage.objectViewer

# Set CORS policy for the bucket (create cors.json first)
cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF
gcloud storage buckets update gs://${BUCKET_NAME} --cors-file=/tmp/cors.json
```

---

## 6. (Optional) Set Up Cloud CDN on GCS Bucket

Cloud CDN requires a Load Balancer frontend. For production, set up a backend bucket:

```bash
# Create backend bucket pointing to GCS
gcloud compute backend-buckets create jewelry-crm-media-cdn \
  --gcs-bucket-name=${BUCKET_NAME} \
  --enable-cdn

# Update MEDIA_URL in production.py to use your CDN domain instead of storage.googleapis.com
```

For a simpler setup, skip CDN initially — `storage.googleapis.com` URLs are fast enough for most use cases.

---

## 7. Store Secrets in Secret Manager

```bash
# Django secret key
echo -n "$(openssl rand -base64 50)" | \
  gcloud secrets create django-secret-key --data-file=-

# Database password (use the one you set in step 4)
echo -n "YOUR_DB_PASSWORD" | \
  gcloud secrets create db-password --data-file=-

# Zoho credentials (if applicable)
echo -n "YOUR_ZOHO_CLIENT_ID" | gcloud secrets create zoho-client-id --data-file=-
echo -n "YOUR_ZOHO_CLIENT_SECRET" | gcloud secrets create zoho-client-secret --data-file=-
echo -n "YOUR_ZOHO_REFRESH_TOKEN" | gcloud secrets create zoho-refresh-token --data-file=-
echo -n "YOUR_ZOHO_ORG_ID" | gcloud secrets create zoho-org-id --data-file=-
```

---

## 8. Grant Cloud Run Service Account Permissions

```bash
PROJECT_NUMBER=$(gcloud projects describe jewelry-crm-prod --format='value(projectNumber)')
SA="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Cloud SQL access
gcloud projects add-iam-policy-binding jewelry-crm-prod \
  --member="${SA}" --role=roles/cloudsql.client

# Cloud Storage access
gcloud projects add-iam-policy-binding jewelry-crm-prod \
  --member="${SA}" --role=roles/storage.objectAdmin

# Secret Manager access
gcloud projects add-iam-policy-binding jewelry-crm-prod \
  --member="${SA}" --role=roles/secretmanager.secretAccessor
```

Also grant Cloud Build the same permissions (it runs deployments):

```bash
CB_SA="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding jewelry-crm-prod \
  --member="${CB_SA}" --role=roles/run.admin
gcloud projects add-iam-policy-binding jewelry-crm-prod \
  --member="${CB_SA}" --role=roles/iam.serviceAccountUser
gcloud projects add-iam-policy-binding jewelry-crm-prod \
  --member="${CB_SA}" --role=roles/cloudsql.client
```

---

## 9. Create Cloud Run Migration Job (one-time setup)

```bash
gcloud run jobs create jewelry-crm-migrate \
  --image=asia-south1-docker.pkg.dev/jewelry-crm-prod/jewelry-crm/backend:latest \
  --region=asia-south1 \
  --command="python,manage.py,migrate" \
  --set-env-vars=DJANGO_SETTINGS_MODULE=config.settings.production,DB_NAME=jewelry_crm,DB_USER=jewelry_user,DB_HOST=/cloudsql/jewelry-crm-prod:asia-south1:jewelry-crm-db,GCS_BUCKET_NAME=jewelry-crm-prod-media \
  --set-secrets=DJANGO_SECRET_KEY=django-secret-key:latest,DB_PASSWORD=db-password:latest \
  --add-cloudsql-instances=jewelry-crm-prod:asia-south1:jewelry-crm-db
```

---

## 10. Deploy Backend to Cloud Run (manual first deploy)

```bash
gcloud run deploy jewelry-crm-api \
  --image=asia-south1-docker.pkg.dev/jewelry-crm-prod/jewelry-crm/backend:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars=DJANGO_SETTINGS_MODULE=config.settings.production,DB_NAME=jewelry_crm,DB_USER=jewelry_user,DB_HOST=/cloudsql/jewelry-crm-prod:asia-south1:jewelry-crm-db,GCS_BUCKET_NAME=jewelry-crm-prod-media,ALLOWED_HOSTS=.run.app,your-domain.com \
  --set-secrets=DJANGO_SECRET_KEY=django-secret-key:latest,DB_PASSWORD=db-password:latest,ZOHO_CLIENT_ID=zoho-client-id:latest,ZOHO_CLIENT_SECRET=zoho-client-secret:latest,ZOHO_REFRESH_TOKEN=zoho-refresh-token:latest,ZOHO_ORGANIZATION_ID=zoho-org-id:latest \
  --add-cloudsql-instances=jewelry-crm-prod:asia-south1:jewelry-crm-db \
  --min-instances=1 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1
```

Note the backend Cloud Run URL (e.g., `https://jewelry-crm-api-xxxx-el.a.run.app`).

---

## 11. Deploy Frontend to Cloud Run

```bash
# Replace BACKEND_URL with the URL from step 10
BACKEND_URL=https://jewelry-crm-api-xxxx-el.a.run.app

# Build frontend image with correct API URL
docker build \
  --build-arg NEXT_PUBLIC_API_URL=${BACKEND_URL} \
  -t asia-south1-docker.pkg.dev/jewelry-crm-prod/jewelry-crm/frontend:latest \
  ./frontend

docker push asia-south1-docker.pkg.dev/jewelry-crm-prod/jewelry-crm/frontend:latest

# Deploy
gcloud run deploy jewelry-crm-frontend \
  --image=asia-south1-docker.pkg.dev/jewelry-crm-prod/jewelry-crm/frontend:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars=NEXT_PUBLIC_API_URL=${BACKEND_URL} \
  --min-instances=1 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1
```

---

## 12. Connect Cloud SQL via Unix Socket

Cloud Run connects to Cloud SQL via a **unix socket** (no need for Cloud SQL Auth Proxy separately — it is built into Cloud Run when you use `--add-cloudsql-instances`).

The `DB_HOST` env var must be set to the socket path:
```
DB_HOST=/cloudsql/jewelry-crm-prod:asia-south1:jewelry-crm-db
```

This is already set in `production.py` when `DB_HOST` env var is passed as shown in steps 10 and 11.

---

## 13. Set Up Cloud Build CI/CD (automatic deploys on push)

1. Connect your repository in Cloud Build:
   - Go to **Cloud Build > Triggers** in the GCP Console
   - Click **Connect Repository** and link your GitHub/GitLab repo
   - Create a trigger pointing to `cloudbuild.yaml` in the repo root

2. Update `cloudbuild.yaml` substitutions:
   - Set `_REGION: asia-south1` (already set)
   - After first manual deploy, update `_REGION_SUFFIX` with your Cloud Run URL hash

3. Grant Cloud Build the permissions from step 8.

Every push to `main` will now automatically build images, run migrations, and deploy both services.

---

## 14. Set Up Custom Domain

### For Backend (API):

```bash
gcloud run domain-mappings create \
  --service=jewelry-crm-api \
  --domain=api.yourdomain.com \
  --region=asia-south1
```

### For Frontend:

```bash
gcloud run domain-mappings create \
  --service=jewelry-crm-frontend \
  --domain=app.yourdomain.com \
  --region=asia-south1
```

After creating mappings, add the DNS records shown by the command to your domain registrar. GCP will automatically provision SSL certificates.

Update `ALLOWED_HOSTS` env var on the backend Cloud Run service to include `api.yourdomain.com`.

Update `NEXT_PUBLIC_API_URL` env var on the frontend to `https://api.yourdomain.com`.

---

## Environment Variables Reference

### Backend (Cloud Run)

| Variable | Value |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` |
| `DB_NAME` | `jewelry_crm` |
| `DB_USER` | `jewelry_user` |
| `DB_HOST` | `/cloudsql/jewelry-crm-prod:asia-south1:jewelry-crm-db` |
| `DB_PORT` | `5432` |
| `GCS_BUCKET_NAME` | `jewelry-crm-prod-media` |
| `ALLOWED_HOSTS` | `api.yourdomain.com,.run.app` |
| `DJANGO_SECRET_KEY` | *(from Secret Manager)* |
| `DB_PASSWORD` | *(from Secret Manager)* |
| `ZOHO_CLIENT_ID` | *(from Secret Manager)* |
| `ZOHO_CLIENT_SECRET` | *(from Secret Manager)* |
| `ZOHO_REFRESH_TOKEN` | *(from Secret Manager)* |
| `ZOHO_ORGANIZATION_ID` | *(from Secret Manager)* |

### Frontend (Cloud Run)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |

---

## Useful Commands

```bash
# View backend logs
gcloud run services logs read jewelry-crm-api --region=asia-south1

# View frontend logs
gcloud run services logs read jewelry-crm-frontend --region=asia-south1

# Run a management command (e.g., createsuperuser)
gcloud run jobs create temp-admin \
  --image=asia-south1-docker.pkg.dev/jewelry-crm-prod/jewelry-crm/backend:latest \
  --region=asia-south1 \
  --command="python,manage.py,createsuperuser,--noinput" \
  --set-env-vars=DJANGO_SUPERUSER_EMAIL=admin@yourdomain.com,DJANGO_SUPERUSER_PASSWORD=changeme \
  --add-cloudsql-instances=jewelry-crm-prod:asia-south1:jewelry-crm-db
gcloud run jobs execute temp-admin --region=asia-south1 --wait

# Check Cloud SQL connection
gcloud sql connect jewelry-crm-db --user=jewelry_user --database=jewelry_crm
```

---

## Next.js Standalone Output Requirement

The frontend Dockerfile uses `output: 'standalone'` mode. Make sure `next.config.js` includes:

```js
const nextConfig = {
  output: 'standalone',
  // ... rest of config
};
```

If this key is missing, add it before building — otherwise `server.js` will not be generated in `.next/standalone/`.
