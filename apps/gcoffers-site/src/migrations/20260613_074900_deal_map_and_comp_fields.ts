import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Additive migration for buyer-facing deal map and underwriting expansion fields:
//   - mapLocation exact coordinates, gated by showExactAddressPublicly before public reads
//   - conditionSummary expanded-card note
//   - saleComps and rentalComps child tables for comparable rows
// Purely additive and reversible.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "deals_sale_comps" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "label" varchar NOT NULL,
    "value" varchar NOT NULL,
    "note" varchar,
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "deals_rental_comps" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "label" varchar NOT NULL,
    "value" varchar NOT NULL,
    "note" varchar,
    "id" serial PRIMARY KEY NOT NULL
  );

  ALTER TABLE "deals" ADD COLUMN "map_location_latitude" numeric;
  ALTER TABLE "deals" ADD COLUMN "map_location_longitude" numeric;
  ALTER TABLE "deals" ADD COLUMN "condition_summary" varchar;

  ALTER TABLE "deals_sale_comps" ADD CONSTRAINT "deals_sale_comps_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "deals_rental_comps" ADD CONSTRAINT "deals_rental_comps_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "deals_sale_comps_order_idx" ON "deals_sale_comps" USING btree ("_order");
  CREATE INDEX "deals_sale_comps_parent_idx" ON "deals_sale_comps" USING btree ("_parent_id");
  CREATE INDEX "deals_rental_comps_order_idx" ON "deals_rental_comps" USING btree ("_order");
  CREATE INDEX "deals_rental_comps_parent_idx" ON "deals_rental_comps" USING btree ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "deals_sale_comps" CASCADE;
  DROP TABLE "deals_rental_comps" CASCADE;
  ALTER TABLE "deals" DROP COLUMN "map_location_latitude";
  ALTER TABLE "deals" DROP COLUMN "map_location_longitude";
  ALTER TABLE "deals" DROP COLUMN "condition_summary";`)
}
