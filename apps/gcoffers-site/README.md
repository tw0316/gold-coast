# Gold Coast Offers site scaffold

App-local Next.js + Payload scaffold for the whole-site `gcoffers.com` migration, including seller pages and main-domain buyer/deals routes.

This app provides:

- Next.js App Router with host-aware seller/buyer surface detection.
- Payload admin/API route scaffolding under `/admin` and `/api`.
- Postgres-backed Payload config using the local Docker Compose database.
- Node 22 / npm lockfile-based dependency management.
- ECS-style production Dockerfile using Next standalone output.
- Payload-backed health routes for ALB/CloudFront deployment smoke checks.

## Prerequisites

- Node 22 (`.nvmrc` is provided).
- npm 10+.
- Docker Desktop or another local Compose-compatible runtime for Postgres.

## Local setup

```bash
cd apps/gcoffers-site
npm install
cp .env.example .env.local
# Replace placeholder values in .env.local as needed. Do not commit real values.
docker compose up -d postgres
npm run payload:importmap
npm run dev
```

Open:

- Public scaffold: <http://localhost:3000>
- Payload admin: <http://localhost:3000/admin>
- GraphQL playground: <http://localhost:3000/api/graphql-playground> in development only.
- Readiness health: <http://localhost:3000/api/health/readiness>
- Public-content health: <http://localhost:3000/api/health/public-content>

Buyer/deals pages are served on the main domain paths, including `/deals/`, `/join/`, and `/faq/`. For local host-aware routing experiments, `buyer.localhost` remains the only buyer-host shortcut.

## Scripts

- `npm run dev` - run the local Next.js dev server.
- `npm run build` - generate the Payload import map and build the Next.js app.
- `npm run start` - start a production build locally.
- `npm run typecheck` - run TypeScript without emitting files.
- `npm run payload:importmap` - regenerate Payload admin import map.
- `npm run payload:types` - generate Payload TypeScript types.
- `npm run verify:scaffold` - focused file/package scaffold verification.

## Environment and privacy defaults

Only `.env.example` is committed. Real `.env.local`, staging, and production values must stay out of git and come from local secrets or AWS Secrets Manager.

`DATABASE_URI` and `PAYLOAD_SECRET` are required for production/start/runtime. If either value is missing or still uses a `[REDACTED_*]` placeholder, `npm run start` and production runtimes fail fast instead of passing unsafe placeholders to Payload/Postgres.

For local-only scaffold commands (`npm run dev`, `npm run build`, `npm run typecheck`, `npm run payload:importmap`, and `npm run payload:types`), the Payload config has explicit development/test fallbacks so contributors can build and typecheck before wiring real local secrets. Replace `.env.local` values when running against a real local Postgres instance.

The GraphQL playground route is development-only. Outside `NODE_ENV=development`, `/api/graphql-playground` returns `404`; GraphQL API routing remains scaffolded separately at `/api/graphql`.

Private media and form source-of-truth buckets stay private. Do not assume public S3 object URLs; public media delivery is app-mediated and form success responses do not expose persistence internals.

## Local Postgres

`docker-compose.yml` starts a local Postgres 16 container with placeholder development credentials only. The compose volume is local developer state and is not part of the production deployment design.

## Docker

Build a production-style container from this app directory:

```bash
docker build -t gcoffers-site:local .
```

The Dockerfile uses `npm ci`, `npm run build`, and Next standalone output. It is suitable as a starting point for ECS/Fargate image builds, but this slice does not deploy or push an image.

## Slice boundary

This scaffold does not implement domain collections, deal visibility predicates, S3-first public forms, GHL/Slack/email side effects, private S3 media delivery, or Terraform. Those are later slices under the accepted ADR.
