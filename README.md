# Jewelry Brand CRM

A custom web-based CRM for a gold/jewelry brand built with Next.js, Django REST Framework, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, shadcn/ui |
| Backend | Python 3.11, Django 4.2, Django REST Framework |
| Database | PostgreSQL 15 |
| Queue | Celery 5, Redis 7 |
| Storage | Google Cloud Storage |
| Hosting | Google Cloud Run |
| Secrets | Google Secret Manager |
| Accounting | Zoho Books API |

## Project Structure

```
jewelry-crm/
├── backend/              # Django REST API
│   ├── config/           # Settings, URLs, Celery config
│   └── apps/
│       ├── accounts/     # Auth, users, roles
│       ├── customers/    # Customer management
│       ├── leads/        # Lead pipeline + activities + tasks
│       ├── products/     # Product catalog, images, certificates, CSV import
│       ├── reservations/ # Product reservation system
│       ├── quotations/   # Quotation builder
│       ├── after_sales/  # Service/repair requests
│       ├── zoho_integration/ # Zoho Books sync
│       ├── reports/      # Dashboard + report endpoints
│       └── audit_logs/   # Action audit trail
├── frontend/             # Next.js App Router
│   ├── app/
│   │   ├── (auth)/       # Login page
│   │   └── (dashboard)/  # All CRM pages
│   ├── components/       # React components
│   ├── lib/              # API client, utilities
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
├── docker-compose.yml    # Local development
├── deploy/               # GCP deployment configs
└── README.md
```

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### 1. Clone and start with Docker Compose

```bash
cd "new crm"
docker-compose up --build
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Django API on http://localhost:8000
- Celery worker + beat scheduler
- Next.js frontend on http://localhost:3000

### 2. Access the application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/
- **API Docs (Swagger)**: http://localhost:8000/api/docs/
- **Django Admin**: http://localhost:8000/admin/

### 3. Default credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| sales_mgr | admin123 | Sales Manager |
| salesperson | admin123 | Salesperson |
| inv_manager | admin123 | Inventory Manager |
| accounts | admin123 | Accounts |
| service | admin123 | Service Staff |

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your local DB and Redis settings

# Run migrations
python manage.py migrate

# Seed demo data
python manage.py seed_data

# Start development server
python manage.py runserver

# In another terminal: start Celery worker
celery -A config.celery worker --loglevel=info

# In another terminal: start Celery beat
celery -A config.celery beat --loglevel=info
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

---

## Importing Products from Zoho Books CSV

1. Go to **Products → Import CSV** in the CRM
2. Upload the Zoho Books item export CSV
3. Preview the mapped rows
4. Click **Import** to start processing
5. Track progress on the import summary screen

The importer handles:
- Normalizing inventory status from `CF.Inventory`
- Normalizing certification values from `CF.Certification present?`
- Detecting SOLD/Returned prefixes in item names
- Missing SKU detection and tracking
- Duplicate SKU detection
- Price parsing (strips "INR " prefix)

---

## User Roles & Permissions

| Module | Admin | Sales Mgr | Salesperson | Inv. Mgr | Accounts | Service |
|--------|-------|-----------|-------------|----------|----------|---------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Customers | ✓ | ✓ | Own only | — | — | — |
| Leads | ✓ | ✓ | Own only | — | — | — |
| Products (view) | ✓ | ✓ | ✓ | ✓ | — | — |
| Products (edit) | ✓ | ✓ | — | ✓ | — | — |
| CSV Import | ✓ | — | — | ✓ | — | — |
| Reservations | ✓ | ✓ | ✓ | — | — | — |
| Quotations | ✓ | ✓ | ✓ | — | — | — |
| After Sales | ✓ | — | — | — | — | ✓ |
| Reports | ✓ | ✓ | — | — | ✓ | — |
| Zoho Sync | ✓ | — | — | — | ✓ | — |
| Settings | ✓ | — | — | — | ✓ | — |

---

## Zoho Books Integration

### Setup
1. Go to **Settings → Zoho Config** in CRM
2. Enter your Zoho Books credentials:
   - Client ID
   - Client Secret
   - Refresh Token
   - Organization ID
   - API Domain (e.g. `https://www.zohoapis.in`)
3. Click **Test Connection**
4. Use **Sync Now** to perform initial sync

### What syncs
| Direction | Data |
|-----------|------|
| Zoho → CRM | Items (products), Contacts, Invoices, Payments, Estimates |
| CRM → Zoho | New customers, Estimates, Invoices |

### Webhook setup
Configure these webhook endpoints in your Zoho Books account:
```
POST https://your-crm-api.com/api/webhooks/zoho/invoice-created/
POST https://your-crm-api.com/api/webhooks/zoho/invoice-updated/
POST https://your-crm-api.com/api/webhooks/zoho/payment-received/
POST https://your-crm-api.com/api/webhooks/zoho/item-updated/
POST https://your-crm-api.com/api/webhooks/zoho/contact-updated/
POST https://your-crm-api.com/api/webhooks/zoho/estimate-accepted/
```

---

## GCP Deployment

### Services used
| Service | Purpose |
|---------|---------|
| Cloud Run | Backend API, Frontend, Celery worker |
| Cloud SQL (PostgreSQL) | Primary database |
| Memorystore (Redis) | Celery broker + result backend |
| Cloud Storage | Product images, certificates, repair photos |
| Secret Manager | All credentials and secrets |
| Cloud Scheduler | Cron jobs for sync and expiry |
| Cloud Logging | Application logs |

### Deploy steps

```bash
# 1. Build and push Docker images
gcloud builds submit --tag gcr.io/PROJECT_ID/jewelry-crm-backend ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/jewelry-crm-frontend ./frontend

# 2. Deploy backend
gcloud run deploy jewelry-crm-api \
  --image gcr.io/PROJECT_ID/jewelry-crm-backend \
  --region asia-south1 \
  --platform managed \
  --set-env-vars DJANGO_SETTINGS_MODULE=config.settings.production \
  --set-secrets "DJANGO_SECRET_KEY=django-secret:latest,ZOHO_CLIENT_ID=zoho-client-id:latest"

# 3. Deploy frontend
gcloud run deploy jewelry-crm-frontend \
  --image gcr.io/PROJECT_ID/jewelry-crm-frontend \
  --region asia-south1 \
  --platform managed \
  --set-env-vars NEXT_PUBLIC_API_URL=https://jewelry-crm-api-xxx-el.a.run.app

# 4. Run migrations
gcloud run jobs execute migrate-job --region asia-south1
```

See `deploy/` directory for full deployment scripts and Cloud Scheduler configs.

---

## API Documentation

Swagger UI is available at `/api/docs/` when the backend is running.

### Key endpoints

```
POST   /api/auth/login/                    Login
GET    /api/auth/me/                       Current user

GET    /api/customers/                     List customers
POST   /api/customers/                     Create customer
GET    /api/customers/{id}/leads/          Customer's leads

GET    /api/leads/                         List leads
POST   /api/leads/{id}/close_won/          Close won
POST   /api/leads/{id}/close_lost/         Close lost

GET    /api/products/                      Product catalog
POST   /api/products/import_csv/           Import CSV
GET    /api/products/available/            Available products
GET    /api/products/missing_sku/          Missing SKU report

POST   /api/reservations/                  Create reservation
POST   /api/reservations/{id}/cancel/      Cancel reservation
POST   /api/reservations/{id}/extend/      Extend reservation

POST   /api/quotations/{id}/convert_to_zoho_invoice/  Convert to Zoho invoice

POST   /api/zoho/sync/items/               Sync items from Zoho
POST   /api/zoho/sync/contacts/            Sync contacts from Zoho
```

---

## Business Rules

- Only **Available** products can be reserved
- **Reserved** products cannot be reserved again
- Reservations auto-expire via hourly Celery job
- Expired/cancelled reservations release the product back to **Available**
- Quotations converted to Zoho invoice mark product as **Sold**
- All Zoho API calls are logged in sync_logs
- Duplicate webhook events are safely ignored (idempotent)
- Zoho OAuth tokens are auto-refreshed

---

## MVP Phases

| Phase | Features |
|-------|---------|
| **Phase 1** ✓ | Login, Dashboard, Customers, Leads, Follow-up Tasks, CSV Import, Product Catalog |
| **Phase 2** ✓ | Product Images, Certificates, Reservations, Quotation Builder |
| **Phase 3** | Zoho Books OAuth, Item Sync, Contact Sync, Invoice Creation, Sync Logs |
| **Phase 4** | After-Sales Module, Reports, Stock Aging, Salesperson Performance |
