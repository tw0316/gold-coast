# Gold Coast Offers Payload site

Live Next.js + Payload app for `gcoffers.com` and `www.gcoffers.com`.

This app owns:

- seller pages at `/`, `/about`, `/privacy-policy`, `/terms`, and related seller routes
- buyer/deals pages under `/deals`
- Payload admin at `/admin`
- public form routes for seller leads, buyer signups, and deal interest
- health routes for ECS/CloudFront smoke checks

`deals.gcoffers.com` is not a live target for the current production site.

## Prerequisites

- Node 22 (`.nvmrc` is provided).
- npm 10+.
- Docker Desktop or another local Compose-compatible runtime for local Postgres.

## Local setup

```bash
cd apps/gcoffers-site
npm ci
cp .env.example .env.local
# Replace placeholder values in .env.local as needed. Do not commit real values.
docker compose up -d postgres
npm run payload:importmap
npm run dev
```

Open:

- Seller site: <http://localhost:3000>
- Deals page: <http://localhost:3000/deals>
- Payload admin: <http://localhost:3000/admin>
- GraphQL playground: <http://localhost:3000/api/graphql-playground> in development only
- Readiness health: <http://localhost:3000/api/health/readiness>
- Public-content health: <http://localhost:3000/api/health/public-content>

## Scripts

- `npm run dev` - run the local Next.js dev server.
- `npm run build` - generate the Payload import map and build the Next.js app.
- `npm run start` - start a production build locally.
- `npm run typecheck` - run TypeScript without emitting files.
- `npm run payload:importmap` - regenerate Payload admin import map.
- `npm run payload:types` - generate Payload TypeScript types.
- `npm run verify:scaffold` - focused app scaffold verification.
- `npm run verify:schema-access` - Payload collection/access safety checks.
- `npm run verify:seller-site` - seller site contract checks.
- `npm run verify:buyer-deals-site` - buyer/deals public route and visibility checks.
- `npm run verify:s3-first-form-pipeline` - public form persistence and side-effect ordering checks.

## Standard local verification

```bash
npm run verify:seller-site
npm run verify:buyer-deals-site
npm run verify:s3-first-form-pipeline
npm run typecheck
npm run build
```

Use mock form persistence locally unless Tej explicitly approves a non-production AWS S3 smoke.

## Environment and privacy defaults

Only `.env.example` is committed. Real `.env.local`, staging, and production values must stay out of git and come from local secrets or AWS Secrets Manager.

`DATABASE_URI` and `PAYLOAD_SECRET` are required for production/start/runtime. If either value is missing or still uses a placeholder, production startup fails fast instead of passing unsafe placeholders to Payload/Postgres.

For local-only scaffold commands, the Payload config has explicit development/test fallbacks so contributors can build and typecheck before wiring real local secrets. Replace `.env.local` values when running against a real local Postgres instance.

The GraphQL playground route is development-only. Outside `NODE_ENV=development`, `/api/graphql-playground` returns `404`; GraphQL API routing remains scaffolded separately at `/api/graphql`.

Private media and form source-of-truth buckets must not use public S3 object URLs. Do not put raw PII, private addresses, secrets, webhook URLs, DB URLs, AWS IDs, ARNs, or credentials in docs, logs, or evidence.

## Local Postgres

`docker-compose.yml` starts a local Postgres 16 container with placeholder development credentials only. The compose volume is local developer state and is not part of the production deployment design.

## Docker

Build a production-style container from this app directory:

```bash
docker build -t gcoffers-site:local .
```

The GitHub deploy workflow builds this Dockerfile, pushes an immutable ECR tag, updates the existing ECS service task definition, invalidates CloudFront, and checks readiness. It does not run Terraform, change DNS, attach CloudFront aliases, or enable live alerts.
