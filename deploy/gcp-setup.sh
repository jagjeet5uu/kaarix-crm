#!/bin/bash
# GCP Infrastructure Setup Script for Jewelry Brand CRM
# Run this once to set up all GCP resources

set -e

PROJECT_ID="your-gcp-project-id"
REGION="asia-south1"
DB_INSTANCE="jewelry-crm-db"
DB_NAME="jewelry_crm"
DB_USER="jewelry_crm_user"
REDIS_INSTANCE="jewelry-crm-redis"
GCS_BUCKET="${PROJECT_ID}-jewelry-crm-media"
SERVICE_ACCOUNT="jewelry-crm-sa"

echo "=== Setting up GCP project: $PROJECT_ID ==="

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  logging.googleapis.com \
  --project=$PROJECT_ID

echo "✓ APIs enabled"

# Create service account
gcloud iam service-accounts create $SERVICE_ACCOUNT \
  --display-name="Jewelry CRM Service Account" \
  --project=$PROJECT_ID

SA_EMAIL="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant permissions to service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"

echo "✓ Service account created"

# Create Cloud SQL PostgreSQL instance
gcloud sql instances create $DB_INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=20GB \
  --backup \
  --backup-start-time=03:00 \
  --project=$PROJECT_ID

gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE \
  --project=$PROJECT_ID

DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE \
  --password=$DB_PASSWORD \
  --project=$PROJECT_ID

echo "✓ Cloud SQL created (password stored in Secret Manager)"

# Create Memorystore Redis instance
gcloud redis instances create $REDIS_INSTANCE \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_0 \
  --tier=basic \
  --project=$PROJECT_ID

REDIS_HOST=$(gcloud redis instances describe $REDIS_INSTANCE \
  --region=$REGION \
  --format='value(host)' \
  --project=$PROJECT_ID)

echo "✓ Redis created at $REDIS_HOST"

# Create Cloud Storage bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$GCS_BUCKET
gsutil cors set deploy/gcs-cors.json gs://$GCS_BUCKET
gsutil iam ch serviceAccount:${SA_EMAIL}:objectAdmin gs://$GCS_BUCKET

echo "✓ GCS bucket created: $GCS_BUCKET"

# Store secrets in Secret Manager
DJANGO_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")

echo -n "$DJANGO_SECRET" | gcloud secrets create django-secret-key \
  --data-file=- --project=$PROJECT_ID

echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
  --data-file=- --project=$PROJECT_ID

# Placeholder secrets (fill these in manually)
echo -n "FILL_IN" | gcloud secrets create zoho-client-id --data-file=- --project=$PROJECT_ID
echo -n "FILL_IN" | gcloud secrets create zoho-client-secret --data-file=- --project=$PROJECT_ID
echo -n "FILL_IN" | gcloud secrets create zoho-refresh-token --data-file=- --project=$PROJECT_ID
echo -n "FILL_IN" | gcloud secrets create zoho-org-id --data-file=- --project=$PROJECT_ID

echo "✓ Secrets stored in Secret Manager"

# Create Cloud Run migration job
gcloud run jobs create jewelry-crm-migrate \
  --image=gcr.io/$PROJECT_ID/jewelry-crm-backend:latest \
  --region=$REGION \
  --command="python,manage.py,migrate" \
  --set-env-vars=DJANGO_SETTINGS_MODULE=config.settings.production \
  --service-account=$SA_EMAIL \
  --project=$PROJECT_ID || true

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Database connection string:"
echo "  Host: /cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
echo "  Name: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo "Redis host: $REDIS_HOST:6379"
echo "GCS Bucket: gs://$GCS_BUCKET"
echo ""
echo "Next steps:"
echo "1. Update Zoho secrets in Secret Manager with real values"
echo "2. Run: gcloud builds submit --config=deploy/cloudbuild.yaml"
echo "3. Set up Zoho webhook endpoints pointing to Cloud Run URL"
