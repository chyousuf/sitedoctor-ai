# SiteDoctor AI - Setup & Deployment Guide

## 1. Quick Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v20 and v26)
- npm or pnpm

### Steps
1. Clone repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. Initialize SQLite database & generate Prisma client:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Run automated test suite:
   ```bash
   npm test
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Environment Variables Configuration

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Prisma DB connection URL | `file:./dev.db` (or `postgresql://...`) |
| `VAULT_MASTER_KEY` | 32-byte hex key for AES-256-GCM vault | `0123456789abcdef...` |
| `APP_SECRET` | Secret string for HMAC tokens | Random 32+ char string |
| `AI_PROVIDER` | AI provider choice (`mock`, `openai`) | `mock` |
| `OPENAI_API_KEY` | Optional OpenAI key | `sk-...` |
| `STORAGE_LOCAL_DIR`| Directory for encrypted backups | `./storage/backups` |

---

## 3. Docker & Container Deployment

To launch the full production stack with PostgreSQL, Redis, and SiteDoctor AI:
```bash
docker-compose up -d
```
This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- SiteDoctor AI Next.js web application on port 3000
