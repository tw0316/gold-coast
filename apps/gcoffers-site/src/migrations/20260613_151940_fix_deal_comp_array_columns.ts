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

   DROP INDEX IF EXISTS "deals_sale_comps_order_idx";
   DROP INDEX IF EXISTS "deals_sale_comps_parent_idx";
   DROP INDEX IF EXISTS "deals_rental_comps_order_idx";
   DROP INDEX IF EXISTS "deals_rental_comps_parent_idx";

   DO $$
   BEGIN
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

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "deals_sale_comps_order_idx";
   DROP INDEX IF EXISTS "deals_sale_comps_parent_idx";
   DROP INDEX IF EXISTS "deals_rental_comps_order_idx";
   DROP INDEX IF EXISTS "deals_rental_comps_parent_idx";

   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = '_order'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = 'order'
     ) THEN
       ALTER TABLE "deals_sale_comps" RENAME COLUMN "_order" TO "order";
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = '_parent_id'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = 'parent_id'
     ) THEN
       ALTER TABLE "deals_sale_comps" RENAME COLUMN "_parent_id" TO "parent_id";
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = '_order'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = 'order'
     ) THEN
       ALTER TABLE "deals_rental_comps" RENAME COLUMN "_order" TO "order";
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = '_parent_id'
     ) AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = 'parent_id'
     ) THEN
       ALTER TABLE "deals_rental_comps" RENAME COLUMN "_parent_id" TO "parent_id";
     END IF;
   END $$;

   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = 'order'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_sale_comps_order_idx" ON "deals_sale_comps" USING btree ("order")';
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_sale_comps' AND column_name = 'parent_id'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_sale_comps_parent_idx" ON "deals_sale_comps" USING btree ("parent_id")';
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = 'order'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_rental_comps_order_idx" ON "deals_rental_comps" USING btree ("order")';
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deals_rental_comps' AND column_name = 'parent_id'
     ) THEN
       EXECUTE 'CREATE INDEX IF NOT EXISTS "deals_rental_comps_parent_idx" ON "deals_rental_comps" USING btree ("parent_id")';
     END IF;
   END $$;
  `)
}
