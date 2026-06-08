# Kaarix CRM — Open-Source Jewelry & Gold Brand CRM

> A full-featured, production-ready **CRM built specifically for jewelry brands, gold retailers, and luxury jewellery businesses**. Manage customers, leads, products, reservations, quotations, after-sales service, and live gold/silver prices — all in one place.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Django](https://img.shields.io/badge/Django-4.2-092E20?logo=django)](https://djangoproject.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | Live KPIs — active leads, inventory value, follow-ups, reservations expiring, service requests |
| 👥 **Customer Management** | Full customer profiles with preferences, sizes, budgets, birthday/anniversary, lead history |
| 🎯 **Lead Pipeline (Kanban)** | Drag-and-drop Kanban board, follow-up scheduling, overdue alerts, activity log |
| 💎 **Product Catalog** | Gold/silver/platinum inventory with images, certifications, weight, purity, live pricing |
| 📦 **Reservations** | Reserve products for customers, advance tracking, auto-expiry via Celery |
| 📋 **Quotation Builder** | Line-item quotations with live gold price calculator, WhatsApp/email/clipboard share |
| 🔧 **After-Sales Service** | Repair, resize, polish, stone replacement — full service request workflow |
| 📈 **Live Gold Prices** | Real-time 24K/22K/18K/14K gold + silver rates with **India domestic pricing** (import duty + GST applied) |
| 📤 **Zoho Books Integration** | Two-way sync — items, contacts, invoices, estimates, payments |
| 📁 **CSV Import** | Bulk import products from Zoho Books CSV export |
| 🔔 **Notifications** | Bell icon shows overdue follow-ups and today's tasks in real time |
| 👤 **Role-Based Access** | Admin, Sales Manager, Salesperson, Inventory Manager, Accounts, Service Staff |
| 📝 **Audit Logs** | Every stage change, product status update, and reservation logged |
| 🏷️ **Dynamic Pricing** | Per-product live price calculator + bulk reprice all products at today's gold rate |

---

## 🖼️ Screenshots

> Dashboard with live gold ticker, Kanban lead pipeline, product catalog with purity chips, quotation builder with price breakdown calculator.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui, TanStack Query |
| **Backend** | Python 3.11, Django 4.2, Django REST Framework, SimpleJWT |
| **Database** | PostgreSQL 15 |
| **Queue** | Celery 5 + Redis 7 |
| **Storage** | Google Cloud Storage (product images, certificates, repair photos) |
| **Hosting** | Google Cloud Run (containerised) |
| **Accounting** | Zoho Books API v3 |
| **Gold Prices** | GoldAPI.io (cached daily at 9 AM IST, India premium applied) |

---

## 🚀 Quick Start (Docker)

```bash
git clone https://github.com/jagjeet5uu/kaarix-crm.git
cd kaarix-crm
cp backend/.env.example backend/.env   # fill in your secrets
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Django API | http://localhost:8000/api/ |
| Swagger Docs | http://localhost:8000/api/docs/ |
| Django Admin | http://localhost:8000/admin/ |

### Default login credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `sales_mgr` | `admin123` | Sales Manager |
| `salesperson` | `admin123` | Salesperson |
| `inv_manager` | `admin123` | Inventory Manager |
| `accounts` | `admin123` | Accounts |
| `service` | `admin123` | Service Staff |

---

## 💻 Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # configure DB, Redis, GoldAPI key, Zoho credentials
python manage.py migrate
python manage.py seed_data      # loads demo customers, leads, products
python manage.py runserver
```

In separate terminals:
```bash
celery -A config.celery worker --loglevel=info   # background tasks
celery -A config.celery beat   --loglevel=info   # scheduled jobs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

---

## 🌟 Key Differentiators for Jewellery Businesses

- **India-accurate gold prices** — applies 15% customs duty + 5% AIDC cess + 3% GST on top of international spot price so you see real MCX-comparable rates
- **Karat-aware pricing** — 24K/22K/18K/14K rates auto-calculated; per-gram calculator for custom orders
- **WhatsApp quotation sharing** — one-click sends a formatted estimate to the customer's WhatsApp
- **Zoho Books sync** — keeps your accounting in sync without double entry
- **Product lifecycle tracking** — Available → Reserved → Sold → Returned → Under Service
- **Service request workflow** — before/after photos, assigned staff, delivery tracking

---

## 📁 Project Structure

```
kaarix-crm/
├── backend/                  # Django REST API
│   ├── config/               # Settings, URLs, Celery config
│   └── apps/
│       ├── accounts/         # Auth, users, JWT, roles
│       ├── customers/        # Customer profiles + preferences
│       ├── leads/            # Lead pipeline, activities, tasks, Kanban
│       ├── products/         # Catalog, images, certificates, CSV import
│       ├── reservations/     # Reservation system with auto-expiry
│       ├── quotations/       # Quotation builder + Zoho estimate/invoice
│       ├── after_sales/      # Service & repair requests
│       ├── zoho_integration/ # Zoho Books OAuth + sync
│       ├── reports/          # Dashboard KPIs + live gold prices
│       └── audit_logs/       # Action audit trail
├── frontend/                 # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/           # Login
│   │   └── (dashboard)/      # All CRM pages
│   ├── components/           # Reusable UI components
│   ├── hooks/                # TanStack Query hooks
│   ├── lib/                  # Axios API client, utilities
│   └── types/                # TypeScript interfaces
├── docker-compose.yml        # Local dev stack
└── deploy/                   # GCP Cloud Run deployment configs
```

---

## 🔑 Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/kaarixcrm

# Django
DJANGO_SECRET_KEY=your-secret-key
DJANGO_SETTINGS_MODULE=config.settings.local

# Redis / Celery
REDIS_URL=redis://localhost:6379/0

# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# GoldAPI.io (https://goldapi.io — free tier available)
GOLDAPI_KEY=your-goldapi-key
GOLD_INDIA_PREMIUM=1.2369   # adjust if duty rates change

# Zoho Books
ZOHO_CLIENT_ID=your-client-id
ZOHO_CLIENT_SECRET=your-client-secret
ZOHO_REFRESH_TOKEN=your-refresh-token
ZOHO_ORGANIZATION_ID=your-org-id
ZOHO_API_DOMAIN=https://www.zohoapis.in
```

---

## 📡 API Endpoints (Key)

```
POST   /api/auth/login/                          Login (returns JWT)
GET    /api/auth/me/                             Current user

GET    /api/customers/                           List / search customers
POST   /api/customers/                           Create customer

GET    /api/leads/                               Lead list with filters
POST   /api/leads/{id}/change_stage/             Move lead stage
POST   /api/leads/{id}/close_won/                Mark won
POST   /api/leads/{id}/close_lost/               Mark lost (with reason)
GET    /api/leads/overdue_follow_ups/            Overdue follow-up list

GET    /api/products/                            Product catalog
POST   /api/products/import_csv/                 Bulk import from Zoho CSV
GET    /api/products/reprice/                    Preview bulk reprice at live rate
POST   /api/products/reprice/                    Apply bulk reprice

POST   /api/reservations/                        Reserve a product
POST   /api/reservations/{id}/cancel/            Cancel reservation
POST   /api/reservations/{id}/extend/            Extend reservation date
POST   /api/reservations/{id}/convert_to_sale/   Mark as sold

GET    /api/reports/gold-prices/                 Live gold & silver rates (INR)
GET    /api/reports/dashboard/                   Dashboard KPIs

POST   /api/zoho/sync/items/                     Sync products from Zoho Books
POST   /api/zoho/sync/contacts/                  Sync customers from Zoho Books
```

Full Swagger docs at `/api/docs/` when running locally.

---

## 👤 Role Permissions

| Module | Admin | Sales Mgr | Salesperson | Inv. Mgr | Accounts | Service |
|--------|:-----:|:---------:|:-----------:|:--------:|:--------:|:-------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Customers | ✓ | ✓ | Own only | — | — | — |
| Leads / Kanban | ✓ | ✓ | Own only | — | — | — |
| Products (view) | ✓ | ✓ | ✓ | ✓ | — | — |
| Products (edit) | ✓ | ✓ | — | ✓ | — | — |
| CSV Import | ✓ | — | — | ✓ | — | — |
| Reservations | ✓ | ✓ | ✓ | — | — | — |
| Quotations | ✓ | ✓ | ✓ | — | — | — |
| After-Sales | ✓ | — | — | — | — | ✓ |
| Reports | ✓ | ✓ | — | — | ✓ | — |
| Zoho Sync | ✓ | — | — | — | ✓ | — |
| Settings / Users | ✓ | — | — | — | — | — |

---

## ☁️ Deploy to GCP Cloud Run

```bash
# Build & push images
gcloud builds submit --tag gcr.io/PROJECT_ID/kaarix-crm-backend ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/kaarix-crm-frontend ./frontend

# Deploy backend
gcloud run deploy kaarix-crm-api \
  --image gcr.io/PROJECT_ID/kaarix-crm-backend \
  --region asia-south1 \
  --set-env-vars DJANGO_SETTINGS_MODULE=config.settings.production

# Deploy frontend
gcloud run deploy kaarix-crm-frontend \
  --image gcr.io/PROJECT_ID/kaarix-crm-frontend \
  --region asia-south1 \
  --set-env-vars NEXT_PUBLIC_API_URL=https://your-api-url.run.app

# Run migrations
gcloud run jobs execute migrate-job --region asia-south1
```

See `deploy/` for full scripts, Cloud Scheduler configs, and Secret Manager setup.

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first for major changes.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes
4. Push and open a PR

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 🔍 Keywords

jewelry crm, gold crm, jewellery management software, gold shop software, jewelry store crm, gold price crm, jewellery erp, gold inventory management, diamond jewelry crm, jewelry brand software, gold retailer crm, jewelry pos system, jewellery shop management, kaarix crm, open source jewelry software, django crm, nextjs crm, zoho books jewelry, mcx gold price, india gold price api, jewelry quotation software, after sales jewelry, jewelry repair management
