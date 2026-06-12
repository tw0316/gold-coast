import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Production follow-up for first live buyer deal entry:
// - normalize existing deal slugs so public links are URL-safe
// - mark public-deal-referenced cover/gallery media as ready/public-reference eligible, while still
//   refusing hidden/archived media and media explicitly flagged as containing private details
//
// Intentional privacy boundary: attaching media to a public deal's cover or gallery publishes it
// through the app-mediated reference-checked proxy only. Direct media reads and raw bucket URLs
// remain blocked, and media flagged as containing private details is never promoted.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    WITH normalized AS (
      SELECT
        "id",
        "slug",
        COALESCE(
          NULLIF(
            regexp_replace(
              regexp_replace(lower("slug"), '[^a-z0-9]+', '-', 'g'),
              '(^-|-$)',
              '',
              'g'
            ),
            ''
          ),
          'deal-' || "id"
        ) AS "base_slug"
      FROM "deals"
    ),
    ranked AS (
      SELECT
        "id",
        "base_slug",
        row_number() OVER (
          PARTITION BY "base_slug"
          ORDER BY
            CASE WHEN "slug" = "base_slug" THEN 0 ELSE 1 END,
            "id"
        ) AS "slug_rank",
        count(*) OVER (PARTITION BY "base_slug") AS "slug_count"
      FROM normalized
    ),
    deduped AS (
      SELECT
        "id",
        CASE
          WHEN "slug_count" > 1 AND "slug_rank" > 1 THEN "base_slug" || '-' || "id"
          ELSE "base_slug"
        END AS "normalized_slug"
      FROM ranked
    )
    UPDATE "deals"
    SET "slug" = deduped."normalized_slug",
        "updated_at" = now()
    FROM deduped
    WHERE "deals"."id" = deduped."id"
      AND "deals"."slug" <> deduped."normalized_slug";

    WITH public_deal_media AS (
      SELECT "cover_photo_id" AS "media_id"
      FROM "deals"
      WHERE "website_visibility" = 'public'
        AND "deal_status" IN ('coming_soon', 'available', 'under_contract', 'sold')
        AND "cover_photo_id" IS NOT NULL

      UNION

      SELECT "deals_rels"."media_id"
      FROM "deals_rels"
      INNER JOIN "deals" ON "deals"."id" = "deals_rels"."parent_id"
      WHERE "deals"."website_visibility" = 'public'
        AND "deals"."deal_status" IN ('coming_soon', 'available', 'under_contract', 'sold')
        AND "deals_rels"."path" = 'photos'
        AND "deals_rels"."media_id" IS NOT NULL
    )
    UPDATE "media"
    SET "access_policy" = 'public_after_reference_check',
        "media_status" = 'ready',
        "updated_at" = now()
    WHERE "media"."id" IN (SELECT "media_id" FROM public_deal_media)
      AND COALESCE("media"."contains_exact_address_or_private_details", false) = false
      AND "media"."media_status" NOT IN ('hidden', 'archived');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Slug normalization and media eligibility promotion are forward-only production repairs.
  `)
}
