# Slice 1 Evidence: Monorepo Refactor

## Scope

- Refactored `tw0316/gold-coast` into the target monorepo skeleton.
- Preserved existing website source bytes and deployed URL shape.
- Did not start data-lake refresh infrastructure.

## Structural Changes

- `site/` -> `apps/website/`
- `deals/` -> `apps/deals/`
- `tools/` -> `apps/tools/`
- `lambda/` -> `services/lead-handler/`
- `infra/*.tf*` -> `infra/website/`
- `docs/STANDARDS.md` -> `docs/ops/website-standards.md`
- Product docs moved under `docs/product/`.
- Reserved `sql/data-lake/` for future analytical SQL.

## Behavior Preservation Checks

- Static checksum comparison passed for all moved `apps/website`, `apps/deals`, and `apps/tools` files after path normalization.
- Local website HTTP smoke passed from `apps/website`:
  - `/` -> 200
  - `/get-your-offer/` -> 200
  - `/privacy-policy/` -> 200
  - `/terms/` -> 200
  - `/css/styles.css` -> 200
  - `/js/main.js` -> 200
  - `/assets/logo-goldcoast.png` -> 200
- `scripts/deploy.sh` now syncs `apps/website/` to the existing S3 bucket root.
- `infra/website/main.tf` now packages Lambda from `services/lead-handler/`.
- `scripts/setup-aws.py` now zips Lambda code from `services/lead-handler/`.

## Verification Commands

- `bash -n scripts/deploy.sh scripts/commit.sh`
- `python3 -m py_compile scripts/upload-site.py scripts/setup-aws.py scripts/setup-cloudfront.py scripts/setup-dns.py scripts/setup-s3.py scripts/check-aws.py scripts/test-aws.py scripts/git-commit.py`
- `node --check services/lead-handler/index.js services/lead-handler/buyer-signup.js apps/website/js/main.js apps/deals/js/deals.js apps/tools/js/app.js apps/tools/js/calc-engine.js`
- `python3 -m json.tool goal-state.json`
- `terraform -chdir=infra/website fmt -check`
- Local static server smoke with `python3 -m http.server --directory apps/website` and `/usr/bin/curl`.

## Result

Slice 1 is verified. The next slice may import the existing data-lake code into `apps/data-lake/`, `sql/data-lake/`, and `docs/ops/` without touching refresh infrastructure yet.
