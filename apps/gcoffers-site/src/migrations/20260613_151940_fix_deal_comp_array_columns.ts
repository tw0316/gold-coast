import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Payload stores array fields that contain row objects with internal `_order` / `_parent_id` columns.
// The original buyer map/comps migration created the comp tables with `order` / `parent_id`, which
// made Payload's Deals list and public deal query fail after deploy because the ORM selects `_order`
// and `_parent_id` for `saleComps` and `rentalComps`.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = 'order'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = '_order'
     ) THEN
       ALTER TABLE "deals_sale_comps" RENAME COLUMN "order" TO "_order";
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = 'parent_id'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = '_parent_id'
     ) THEN
       ALTER TABLE "deals_sale_comps" RENAME COLUMN "parent_id" TO "_parent_id";
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = 'order'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = '_order'
     ) THEN
       ALTER TABLE "deals_rental_comps" RENAME COLUMN "order" TO "_order";
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = 'parent_id'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = '_parent_id'
     ) THEN
       ALTER TABLE "deals_rental_comps" RENAME COLUMN "parent_id" TO "_parent_id";
     END IF;
   END $$;

   DO $$
   BEGIN
     -- PostgreSQL keeps existing indexes attached when columns are renamed.
     -- Do not drop indexes here; fresh installs already have the correct indexes from 074900.
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = '_order'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_sale_comps_order_idx" ON "deals_sale_comps" USING btree ("_order")';
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = '_parent_id'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_sale_comps_parent_idx" ON "deals_sale_comps" USING btree ("_parent_id")';
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = '_order'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_rental_comps_order_idx" ON "deals_rental_comps" USING btree ("_order")';
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = '_parent_id'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_rental_comps_parent_idx" ON "deals_rental_comps" USING btree ("_parent_id")';
     END IF;
   END $$;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally no-op. Reverting this repair would put Deal comp tables back into the
  // Payload-incompatible `order` / `parent_id` shape that this migration fixes.
  // On fresh installs, 074900 already creates `_order` / `_parent_id`; rolling this
  // migration back must not mutate that still-applied schema into a state that never existed.
}
