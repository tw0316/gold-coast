import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Production hardening for the first live CMS users/content:
// - legacy authenticated users may predate role assignment; treat missing role rows as editor
// - seed default South Florida markets so the Deals market relationship is usable immediately
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    WITH first_legacy_user AS (
      SELECT "id"
      FROM "users"
      WHERE "role" IS NULL
      ORDER BY "created_at" ASC, "id" ASC
      LIMIT 1
    )
    UPDATE "users"
    SET "role" = CASE
      WHEN "id" IN (SELECT "id" FROM first_legacy_user) THEN 'admin'::"enum_users_role"
      ELSE 'editor'::"enum_users_role"
    END
    WHERE "role" IS NULL;

    INSERT INTO "markets" ("name", "slug", "county", "sort_order", "enabled", "description", "updated_at", "created_at")
    VALUES
      ('Miami-Dade', 'miami-dade', 'miami_dade', 10, true, 'Primary Gold Coast buyer/seller market.', now(), now()),
      ('Broward', 'broward', 'broward', 20, true, 'Primary Gold Coast buyer/seller market.', now(), now()),
      ('Palm Beach', 'palm-beach', 'palm_beach', 30, true, 'Primary Gold Coast buyer/seller market.', now(), now())
    ON CONFLICT ("slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "county" = EXCLUDED."county",
      "sort_order" = EXCLUDED."sort_order",
      "enabled" = true,
      "updated_at" = now();
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "markets"
    WHERE "slug" IN ('miami-dade', 'broward', 'palm-beach')
      AND NOT EXISTS (
        SELECT 1
        FROM "deals"
        WHERE "deals"."market_id" = "markets"."id"
      );
  `)
}
