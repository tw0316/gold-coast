#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cwd, exit } from 'node:process'

const root = cwd()
const requiredFiles = [
  'package.json',
  'package-lock.json',
  '.nvmrc',
  '.env.example',
  '.gitignore',
  'Dockerfile',
  'docker-compose.yml',
  'README.md',
  'next.config.mjs',
  'tsconfig.json',
  'src/payload.config.ts',
  'src/collections/Users.ts',
  'src/app/(frontend)/layout.tsx',
  'src/app/(frontend)/page.tsx',
  'src/app/(payload)/layout.tsx',
  'src/app/(payload)/admin/importMap.ts',
  'src/app/(payload)/admin/[[...segments]]/page.tsx',
  'src/app/(payload)/api/[...slug]/route.ts',
  'src/app/(payload)/api/graphql/route.ts',
  'src/app/(payload)/api/graphql-playground/route.ts',
  'src/app/api/health/readiness/route.ts',
  'src/app/api/health/public-content/route.ts',
]

const failures = []

for (const file of requiredFiles) {
  try {
    const stats = statSync(join(root, file))
    if (!stats.isFile()) {
      failures.push(`${file} is not a file`)
    }
  } catch {
    failures.push(`${file} is missing`)
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const requiredScripts = ['dev', 'build', 'start', 'typecheck', 'payload', 'payload:importmap', 'verify:scaffold']
for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) {
    failures.push(`package.json missing script: ${script}`)
  }
}

if (pkg.private !== true) {
  failures.push('package.json must remain private')
}

if (!pkg.engines?.node?.includes('22')) {
  failures.push('package.json should declare Node 22 engine support')
}

if (!pkg.devDependencies?.['@types/node']?.startsWith('22.')) {
  failures.push('package.json should use Node 22 @types/node')
}

const envExample = readFileSync(join(root, '.env.example'), 'utf8')
for (const key of ['DATABASE_URI=', 'PAYLOAD_SECRET=', 'PAYLOAD_MEDIA_BUCKET=', 'FORM_SUBMISSIONS_BUCKET=']) {
  if (!envExample.includes(key)) {
    failures.push(`.env.example missing ${key}`)
  }
}

if (/https:\/\/hooks\.slack\.com\//.test(envExample)) {
  failures.push('.env.example must not contain a real Slack webhook URL')
}

const dockerfile = readFileSync(join(root, 'Dockerfile'), 'utf8')
if (!dockerfile.includes('npm ci') || !dockerfile.includes('npm run build')) {
  failures.push('Dockerfile should install with npm ci and build the app')
}

const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8')
if (!compose.includes('postgres:16')) {
  failures.push('docker-compose.yml should provide local Postgres 16')
}

const payloadConfig = readFileSync(join(root, 'src/payload.config.ts'), 'utf8')
if (payloadConfig.includes('process.env.PAYLOAD_SECRET ??')) {
  failures.push('payload.config.ts must not use an unconditional PAYLOAD_SECRET fallback')
}

if (payloadConfig.includes('const databaseURI = process.env.DATABASE_URI')) {
  failures.push('payload.config.ts must not pass possibly undefined DATABASE_URI to Postgres')
}

if (!payloadConfig.includes('requireConfigEnv') || !payloadConfig.includes("npm_lifecycle_event === 'start'")) {
  failures.push('payload.config.ts should fail fast for missing production runtime env')
}

const usersCollection = readFileSync(join(root, 'src/collections/Users.ts'), 'utf8')
if (/defaultValue:\s*['"]admin['"]/.test(usersCollection)) {
  failures.push('users role must not default to admin')
}

const playgroundRoute = readFileSync(join(root, 'src/app/(payload)/api/graphql-playground/route.ts'), 'utf8')
if (!playgroundRoute.includes("NODE_ENV === 'development'") || !playgroundRoute.includes('status: 404')) {
  failures.push('GraphQL playground route must be development-only with a disabled response outside dev')
}

if (failures.length > 0) {
  console.error('Scaffold verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  exit(1)
}

console.log('Scaffold verification passed')
