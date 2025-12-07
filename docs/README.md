# 📚 Guriri Express Documentation

> B2B Delivery Platform - Complete Technical Documentation

## 🚀 Quick Start

- **New to Guriri Express?** Start with [Getting Started Guide](./guides/getting-started.md)
- **API Developer?** Jump to [API Reference](./api/index.md)
- **Need Postman Collection?** Download [GuririExpress.postman_collection.json](./postman/GuririExpress.postman_collection.json)

---

## 📖 Documentation Structure

```
docs/
├── api/                    # API Reference (DocGoat-style tree)
│   ├── authentication/     # Register/Login endpoints
│   ├── orders/             # Order lifecycle docs
│   ├── chat-and-ai/        # Messaging + AI endpoints
│   ├── analytics/          # KPI and payout dashboards
│   └── variables.md        # Resolved Postman variables
├── guides/                 # User guides by role
├── architecture/           # System design docs
├── deployment/             # DevOps and infrastructure
├── security/               # Security policies
└── reports/                # Historical reports

> Legacy hand-written API docs were moved to `docs/api-legacy/` for archival purposes. New work should target `docs/api/` generated via `npm run docs:api`.
```

---

## 🔗 Quick Links

### 🎯 By Role

| Role | Documentation |
|------|---------------|
| **Frontend Developer** | [API Reference](./api/index.md) • [WebSocket Events](./api/websocket/events.md) |
| **Backend Developer** | [Architecture](./architecture/system-overview.md) • [Database Schema](./architecture/database-schema.md) |
| **Client (Restaurant/Shop)** | [Client Onboarding](./guides/client-onboarding.md) • [Order Flow](./guides/order-lifecycle.md) |
| **Motoboy (Driver)** | [Driver App Guide](./guides/driver-usage.md) • [GPS Tracking](./api/websocket/events.md#update_location) |
| **Central (Admin)** | [Dashboard Guide](./guides/central-dashboard.md) • [Analytics](./api/v1/endpoints/analytics/index.md) |
| **DevOps** | [Production Deployment](./deployment/production.md) • [Docker Setup](./deployment/docker.md) |

### 📡 By Topic

#### API Reference
- [Authentication](./api/authentication/index.md) - Login, register, JWT
- [Orders](./api/orders/index.md) - Create, accept, deliver, cancel
- [Chat & AI](./api/chat-and-ai/index.md) - Real-time messaging with AI suggestions
- [Analytics](./api/analytics/index.md) - KPIs, revenue, earnings
- [WebSocket Events](./api/websocket/events.md) - Real-time bidirectional events

#### Guides
- [Getting Started](./guides/getting-started.md) - Local setup and first run
- [Client Onboarding](./guides/client-onboarding.md) - Restaurant/shop registration
- [Driver App Usage](./guides/driver-usage.md) - Motoboy mobile app
- [Order Lifecycle](./guides/order-lifecycle.md) - From creation to delivery
- [Chat System](./guides/chat-system.md) - AI-powered filtering

#### Architecture
- [System Overview](./architecture/system-overview.md) - High-level deployment + data flow
- [Frontend Architecture](./architecture/frontend-architecture.md) - React layers (adapters → services → hooks)
- [Testing Strategy](./architecture/testing-strategy.md) - Vitest coverage for services and hooks

#### Testing
- [Testing Strategy](./architecture/testing-strategy.md) - How to run and extend Vitest suites

#### Security
- [Authentication & Authorization](./security/authentication.md) - JWT + RBAC
- [Rate Limiting](./security/rate-limiting.md) - DDoS protection
- [Security Module](./security/security-module.md) - Agent Zero v3.0
- [Data Privacy](./security/data-privacy.md) - LGPD compliance

#### Deployment
- [Local Development](./deployment/local-setup.md) - Run on your machine
- [Production Deployment](./deployment/production.md) - Deploy to Replit/VPS
- [Docker Setup](./deployment/docker.md) - Containerized deployment
- [Environment Variables](./deployment/environment.md) - Configuration guide

---

## 📦 Postman Collection

### Download & Import

1. **Download:** [GuririExpress.postman_collection.json](./postman/GuririExpress.postman_collection.json)
2. **Import to Postman:** File → Import → Select downloaded JSON
3. **Configure Environment:**
   - `API_URL`: `http://localhost:5000` (or production URL)
   - `TOKEN`: Leave empty (auto-filled after login)

### Collection Structure

```
Guriri Express API v1.0
├── Authentication
│   ├── POST Register Client (PF/PJ)
│   └── POST Login
├── Orders
│   ├── POST Create Order
│   ├── GET List Orders
│   ├── POST Accept Order (Motoboy)
│   └── POST Deliver Order
├── Chat & AI
│   ├── GET Chat Messages
│   ├── POST Send Message
│   └── POST AI Suggestion
└── Analytics
    ├── GET Dashboard KPIs (Central)
    └── GET Motoboy Earnings
```

**Features:**
- ✅ Auto-save JWT token after login
- ✅ Request/response examples for all endpoints
- ✅ Pre-request scripts for authentication
- ✅ Test scripts for response validation

---

## 🔄 Regenerating Docs from Postman

This repo now ships a deterministic generator that mirrors the DocGoat (`postman-md-docs`) schema without requiring Node 20.

```bash
# Rebuild docs/api/ from the collection
npm run docs:api
```

What the script does:

1. Parses `docs/postman/GuririExpress.postman_collection.json`.
2. Recreates `docs/api/` (folders per Postman section, one file per request).
3. Emits `index.md`, `variables.md`, and `index.json` metadata.

### CI Example

```yaml
name: Update API Docs
on:
  push:
    paths:
      - 'docs/postman/GuririExpress.postman_collection.json'

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run docs:api
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "docs: sync API reference"
```

---

## 🎯 API Versioning

### Current Version: v1.0

**Base URL:** `{{API_URL}}/api/v1`

### Version Policy

- **Backward Compatibility:** Minor changes (new fields, optional params) do not increment version
- **Breaking Changes:** Major changes (removed fields, changed types) require new version (v2.0)
- **Deprecation:** Old versions supported for 6 months after new version release

### Migration Guide

When v2.0 is released, see [Migration Guide v1 → v2](./guides/migration-v1-to-v2.md)

---

## 📊 API Statistics

| Metric | Count |
|--------|-------|
| **Total Endpoints** | 48 |
| **Authentication Endpoints** | 2 |
| **Order Management** | 9 |
| **Motoboy Management** | 11 |
| **Client Management** | 8 |
| **Chat & AI** | 9 |
| **Analytics** | 5 |
| **Admin/Users** | 4 |
| **WebSocket Events** | 7 |

---

## 🛠️ Tech Stack

- **Backend:** Node.js 18+, Express.js, TypeScript
- **Database:** PostgreSQL 15+ with Drizzle ORM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-Time:** Socket.IO (WebSocket)
- **AI:** OpenAI GPT-4 Turbo
- **Validation:** Zod schemas
- **Rate Limiting:** express-rate-limit
- **File Upload:** Multer

---

## 🤝 Contributing

### Updating Documentation

1. **Update Postman Collection:**
   - Make changes in Postman app
   - Export as Collection v2.1
   - Replace `docs/postman/GuririExpress.postman_collection.json`

2. **Regenerate Markdown:**
   ```bash
   npm run docs:generate
   ```

3. **Review Changes:**
   ```bash
   git diff docs/api
   ```

4. **Commit:**
   ```bash
   git add docs/
   git commit -m "docs: update API endpoints"
   ```

### Manual Documentation

For guides, architecture, and security docs (non-API), edit Markdown files directly in:
- `docs/guides/`
- `docs/architecture/`
- `docs/security/`
- `docs/deployment/`

---

## 📞 Support

- **Technical Issues:** [GitHub Issues](https://github.com/IAforIA/GuririExpress/issues)
- **API Questions:** Check [API Reference](./api/v1/index.md) first
- **Business Inquiries:** contato@guririexpress.com

---

## 📄 License

Guriri Express is proprietary software. © 2024 All rights reserved.

---

**Last Updated:** 2024-11-24  
**Documentation Version:** 1.0  
**API Version:** v1.0
