import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Additive migration for the buyer-facing deal CMS fields:
//   - bestUse (hasMany select) and featureTags (hasMany select) child tables
//   - propertyType + units, rental data (market/current rent, cap rate)
//   - coverPhoto (single media upload) and videoTourUrl
// Purely additive and reversible. The retired `deal_type` and `neighborhood`
// columns are intentionally left in place (nullable / defaulted) so this migration
// stays non-destructive; a later migration can drop them once data is confirmed clear.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_deals_best_use" AS ENUM('fix_and_flip', 'buy_and_hold', 'brrrr', 'turnkey_immediate_equity', 'land_bank', 'development');
  CREATE TYPE "public"."enum_deals_property_details_property_type" AS ENUM('single_family', 'condo', 'townhouse', 'duplex', 'multifamily', 'land');
  CREATE TYPE "public"."enum_deals_feature_tags" AS ENUM('cash_only', 'tenant_occupied', 'cosmetic_reno', 'full_gut', 'owner_financing', 'pool', 'waterfront', 'corner_lot', 'new_roof');

  CREATE TABLE "deals_best_use" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_deals_best_use",
  	"id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "deals_feature_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_deals_feature_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );

  ALTER TABLE "deals" ADD COLUMN "property_details_property_type" "enum_deals_property_details_property_type";
  ALTER TABLE "deals" ADD COLUMN "property_details_units" numeric;
  ALTER TABLE "deals" ADD COLUMN "financials_market_rent" numeric;
  ALTER TABLE "deals" ADD COLUMN "financials_current_rent" numeric;
  ALTER TABLE "deals" ADD COLUMN "financials_est_cap_rate" numeric;
  ALTER TABLE "deals" ADD COLUMN "cover_photo_id" integer;
  ALTER TABLE "deals" ADD COLUMN "video_tour_url" varchar;

  ALTER TABLE "deals_best_use" ADD CONSTRAINT "deals_best_use_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "deals_feature_tags" ADD CONSTRAINT "deals_feature_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "deals" ADD CONSTRAINT "deals_cover_photo_id_media_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

  CREATE INDEX "deals_best_use_order_idx" ON "deals_best_use" USING btree ("order");
  CREATE INDEX "deals_best_use_parent_idx" ON "deals_best_use" USING btree ("parent_id");
  CREATE INDEX "deals_feature_tags_order_idx" ON "deals_feature_tags" USING btree ("order");
  CREATE INDEX "deals_feature_tags_parent_idx" ON "deals_feature_tags" USING btree ("parent_id");
  CREATE INDEX "deals_cover_photo_idx" ON "deals" USING btree ("cover_photo_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "deals_best_use" CASCADE;
  DROP TABLE "deals_feature_tags" CASCADE;
  ALTER TABLE "deals" DROP CONSTRAINT "deals_cover_photo_id_media_id_fk";
  DROP INDEX "deals_cover_photo_idx";
  ALTER TABLE "deals" DROP COLUMN "property_details_property_type";
  ALTER TABLE "deals" DROP COLUMN "property_details_units";
  ALTER TABLE "deals" DROP COLUMN "financials_market_rent";
  ALTER TABLE "deals" DROP COLUMN "financials_current_rent";
  ALTER TABLE "deals" DROP COLUMN "financials_est_cap_rate";
  ALTER TABLE "deals" DROP COLUMN "cover_photo_id";
  ALTER TABLE "deals" DROP COLUMN "video_tour_url";
  DROP TYPE "public"."enum_deals_best_use";
  DROP TYPE "public"."enum_deals_property_details_property_type";
  DROP TYPE "public"."enum_deals_feature_tags";`)
}
