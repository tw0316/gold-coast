import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_media_access_policy" AS ENUM('private', 'public_after_reference_check');
  CREATE TYPE "public"."enum_media_media_status" AS ENUM('draft', 'ready', 'hidden', 'archived');
  CREATE TYPE "public"."enum_markets_county" AS ENUM('miami_dade', 'broward', 'palm_beach', 'other');
  CREATE TYPE "public"."enum_pages_sections_section_type" AS ENUM('hero', 'rich_text', 'cta', 'two_column', 'legal', 'faq_embed', 'deals_embed');
  CREATE TYPE "public"."enum_pages_surface" AS ENUM('seller', 'buyer', 'shared');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_faqs_surface" AS ENUM('seller', 'buyer', 'shared');
  CREATE TYPE "public"."enum_faqs_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_deals_deal_type" AS ENUM('wholesale', 'fix_and_flip', 'rental', 'land', 'other');
  CREATE TYPE "public"."enum_deals_website_visibility" AS ENUM('hidden', 'preview', 'public', 'archived');
  CREATE TYPE "public"."enum_deals_deal_status" AS ENUM('draft', 'coming_soon', 'available', 'under_contract', 'sold', 'cancelled');
  CREATE TYPE "public"."enum_deals_property_details_occupancy" AS ENUM('vacant', 'occupied', 'unknown');
  CREATE TYPE "public"."enum_site_settings_navigation_surface" AS ENUM('seller', 'buyer', 'shared');
  CREATE TYPE "public"."enum_site_settings_surface" AS ENUM('seller', 'buyer', 'shared');
  CREATE TYPE "public"."enum_buyer_signups_property_types" AS ENUM('single_family', 'multifamily', 'condo_townhome', 'land');
  CREATE TYPE "public"."enum_buyer_signups_buyer_type" AS ENUM('cash_buyer', 'financed_buyer', 'agent', 'other');
  CREATE TYPE "public"."enum_buyer_signups_purchase_method" AS ENUM('cash', 'hard_money', 'financing', 'undecided');
  CREATE TYPE "public"."enum_buyer_signups_source" AS ENUM('deals-website', 'buyer-list');
  CREATE TYPE "public"."enum_buyer_signups_s3_first_status" AS ENUM('s3_persisted', 'mirror_repair_needed');
  CREATE TYPE "public"."enum_buyer_signups_ghl_sync_status" AS ENUM('not_attempted', 'queued', 'succeeded', 'failed');
  CREATE TYPE "public"."enum_deal_interest_source" AS ENUM('deals-website');
  CREATE TYPE "public"."enum_deal_interest_s3_first_status" AS ENUM('s3_persisted', 'mirror_repair_needed');
  CREATE TYPE "public"."enum_deal_interest_ghl_sync_status" AS ENUM('not_attempted', 'queued', 'succeeded', 'failed');
  CREATE TYPE "public"."enum_deal_interest_alert_status" AS ENUM('not_attempted', 'queued', 'sent', 'failed');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"access_policy" "enum_media_access_policy" DEFAULT 'private' NOT NULL,
  	"media_status" "enum_media_media_status" DEFAULT 'draft' NOT NULL,
  	"contains_exact_address_or_private_details" boolean DEFAULT false,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "media_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"deals_id" integer,
  	"faqs_id" integer,
  	"site_settings_id" integer
  );
  
  CREATE TABLE "markets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"county" "enum_markets_county" NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"enabled" boolean DEFAULT true,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_type" "enum_pages_sections_section_type" DEFAULT 'rich_text' NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"image_id" integer,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"sort_order" numeric DEFAULT 0
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"surface" "enum_pages_surface" DEFAULT 'seller' NOT NULL,
  	"status" "enum_pages_status" DEFAULT 'draft' NOT NULL,
  	"summary" varchar,
  	"navigation_show_in_nav" boolean DEFAULT false,
  	"navigation_nav_label" varchar,
  	"navigation_sort_order" numeric DEFAULT 0,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_canonical_path" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"surface" "enum_faqs_surface" DEFAULT 'buyer' NOT NULL,
  	"status" "enum_faqs_status" DEFAULT 'draft' NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"related_page_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "deals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"deal_type" "enum_deals_deal_type" DEFAULT 'wholesale' NOT NULL,
  	"website_visibility" "enum_deals_website_visibility" DEFAULT 'hidden' NOT NULL,
  	"deal_status" "enum_deals_deal_status" DEFAULT 'draft' NOT NULL,
  	"market_id" integer,
  	"area" varchar,
  	"neighborhood" varchar,
  	"city" varchar,
  	"county" varchar,
  	"zip" varchar,
  	"show_exact_address_publicly" boolean DEFAULT false,
  	"exact_address" varchar,
  	"property_details_beds" numeric,
  	"property_details_baths" numeric,
  	"property_details_sqft" numeric,
  	"property_details_lot_size" varchar,
  	"property_details_year_built" numeric,
  	"property_details_construction" varchar,
  	"property_details_occupancy" "enum_deals_property_details_occupancy",
  	"financials_asking_price" numeric,
  	"financials_arv" numeric,
  	"financials_estimated_rehab" numeric,
  	"financials_estimated_closing_costs" numeric,
  	"financials_potential_profit_override" numeric,
  	"financials_potential_r_o_i_override" numeric,
  	"financials_closed_price" numeric,
  	"summary" varchar,
  	"rehab_scope" varchar,
  	"disclaimer" varchar DEFAULT 'Deal information is provided for preliminary review only. Buyers are responsible for independent due diligence, inspections, title review, financing, and verifying all numbers before making an offer.',
  	"internal_notes" varchar,
  	"closed_at" timestamp(3) with time zone,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "deals_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "site_settings_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"surface" "enum_site_settings_navigation_surface" DEFAULT 'shared' NOT NULL,
  	"sort_order" numeric DEFAULT 0
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar DEFAULT 'Default site settings' NOT NULL,
  	"surface" "enum_site_settings_surface" DEFAULT 'shared' NOT NULL,
  	"is_public" boolean DEFAULT true,
  	"footer_disclaimer" varchar,
  	"public_contact_label" varchar,
  	"seo_defaults_title" varchar,
  	"seo_defaults_description" varchar,
  	"seo_defaults_open_graph_image_id" integer,
  	"alerting_deal_interest_alerts_enabled" boolean DEFAULT false,
  	"alerting_routing_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "buyer_signups_property_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_buyer_signups_property_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "buyer_signups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"s3_object_key" varchar NOT NULL,
  	"submitted_at" timestamp(3) with time zone NOT NULL,
  	"email" varchar NOT NULL,
  	"email_hash" varchar,
  	"full_name" varchar,
  	"phone" varchar,
  	"buyer_type" "enum_buyer_signups_buyer_type",
  	"price_range" varchar,
  	"purchase_method" "enum_buyer_signups_purchase_method",
  	"source" "enum_buyer_signups_source" DEFAULT 'deals-website' NOT NULL,
  	"service_consent" boolean DEFAULT false,
  	"marketing_consent" boolean DEFAULT false,
  	"sms_consent" boolean DEFAULT false,
  	"consent_timestamp" timestamp(3) with time zone,
  	"s3_first_status" "enum_buyer_signups_s3_first_status" DEFAULT 's3_persisted' NOT NULL,
  	"ghl_sync_status" "enum_buyer_signups_ghl_sync_status" DEFAULT 'not_attempted',
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "buyer_signups_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"markets_id" integer
  );
  
  CREATE TABLE "deal_interest" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"s3_object_key" varchar NOT NULL,
  	"deal_id" integer,
  	"deal_slug" varchar NOT NULL,
  	"submitted_at" timestamp(3) with time zone NOT NULL,
  	"email" varchar NOT NULL,
  	"email_hash" varchar,
  	"full_name" varchar,
  	"phone" varchar,
  	"message" varchar,
  	"source" "enum_deal_interest_source" DEFAULT 'deals-website' NOT NULL,
  	"s3_first_status" "enum_deal_interest_s3_first_status" DEFAULT 's3_persisted' NOT NULL,
  	"ghl_sync_status" "enum_deal_interest_ghl_sync_status" DEFAULT 'not_attempted',
  	"alert_status" "enum_deal_interest_alert_status" DEFAULT 'not_attempted',
  	"redacted_alert_summary" varchar,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"markets_id" integer,
  	"pages_id" integer,
  	"faqs_id" integer,
  	"deals_id" integer,
  	"site_settings_id" integer,
  	"buyer_signups_id" integer,
  	"deal_interest_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_deals_fk" FOREIGN KEY ("deals_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_sections" ADD CONSTRAINT "pages_sections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_sections" ADD CONSTRAINT "pages_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faqs" ADD CONSTRAINT "faqs_related_page_id_pages_id_fk" FOREIGN KEY ("related_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "deals" ADD CONSTRAINT "deals_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "deals_rels" ADD CONSTRAINT "deals_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "deals_rels" ADD CONSTRAINT "deals_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_navigation" ADD CONSTRAINT "site_settings_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_seo_defaults_open_graph_image_id_media_id_fk" FOREIGN KEY ("seo_defaults_open_graph_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "buyer_signups_property_types" ADD CONSTRAINT "buyer_signups_property_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."buyer_signups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "buyer_signups_rels" ADD CONSTRAINT "buyer_signups_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."buyer_signups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "buyer_signups_rels" ADD CONSTRAINT "buyer_signups_rels_markets_fk" FOREIGN KEY ("markets_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "deal_interest" ADD CONSTRAINT "deal_interest_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_markets_fk" FOREIGN KEY ("markets_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_deals_fk" FOREIGN KEY ("deals_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_buyer_signups_fk" FOREIGN KEY ("buyer_signups_id") REFERENCES "public"."buyer_signups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_deal_interest_fk" FOREIGN KEY ("deal_interest_id") REFERENCES "public"."deal_interest"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_access_policy_idx" ON "media" USING btree ("access_policy");
  CREATE INDEX "media_media_status_idx" ON "media" USING btree ("media_status");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_rels_order_idx" ON "media_rels" USING btree ("order");
  CREATE INDEX "media_rels_parent_idx" ON "media_rels" USING btree ("parent_id");
  CREATE INDEX "media_rels_path_idx" ON "media_rels" USING btree ("path");
  CREATE INDEX "media_rels_pages_id_idx" ON "media_rels" USING btree ("pages_id");
  CREATE INDEX "media_rels_deals_id_idx" ON "media_rels" USING btree ("deals_id");
  CREATE INDEX "media_rels_faqs_id_idx" ON "media_rels" USING btree ("faqs_id");
  CREATE INDEX "media_rels_site_settings_id_idx" ON "media_rels" USING btree ("site_settings_id");
  CREATE UNIQUE INDEX "markets_slug_idx" ON "markets" USING btree ("slug");
  CREATE INDEX "markets_sort_order_idx" ON "markets" USING btree ("sort_order");
  CREATE INDEX "markets_enabled_idx" ON "markets" USING btree ("enabled");
  CREATE INDEX "markets_updated_at_idx" ON "markets" USING btree ("updated_at");
  CREATE INDEX "markets_created_at_idx" ON "markets" USING btree ("created_at");
  CREATE INDEX "pages_sections_order_idx" ON "pages_sections" USING btree ("_order");
  CREATE INDEX "pages_sections_parent_id_idx" ON "pages_sections" USING btree ("_parent_id");
  CREATE INDEX "pages_sections_image_idx" ON "pages_sections" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_surface_idx" ON "pages" USING btree ("surface");
  CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "faqs_surface_idx" ON "faqs" USING btree ("surface");
  CREATE INDEX "faqs_status_idx" ON "faqs" USING btree ("status");
  CREATE INDEX "faqs_sort_order_idx" ON "faqs" USING btree ("sort_order");
  CREATE INDEX "faqs_related_page_idx" ON "faqs" USING btree ("related_page_id");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE UNIQUE INDEX "deals_slug_idx" ON "deals" USING btree ("slug");
  CREATE INDEX "deals_website_visibility_idx" ON "deals" USING btree ("website_visibility");
  CREATE INDEX "deals_deal_status_idx" ON "deals" USING btree ("deal_status");
  CREATE INDEX "deals_market_idx" ON "deals" USING btree ("market_id");
  CREATE INDEX "deals_updated_at_idx" ON "deals" USING btree ("updated_at");
  CREATE INDEX "deals_created_at_idx" ON "deals" USING btree ("created_at");
  CREATE INDEX "deals_rels_order_idx" ON "deals_rels" USING btree ("order");
  CREATE INDEX "deals_rels_parent_idx" ON "deals_rels" USING btree ("parent_id");
  CREATE INDEX "deals_rels_path_idx" ON "deals_rels" USING btree ("path");
  CREATE INDEX "deals_rels_media_id_idx" ON "deals_rels" USING btree ("media_id");
  CREATE INDEX "site_settings_navigation_order_idx" ON "site_settings_navigation" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_parent_id_idx" ON "site_settings_navigation" USING btree ("_parent_id");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_is_public_idx" ON "site_settings" USING btree ("is_public");
  CREATE INDEX "site_settings_seo_defaults_seo_defaults_open_graph_image_idx" ON "site_settings" USING btree ("seo_defaults_open_graph_image_id");
  CREATE INDEX "site_settings_updated_at_idx" ON "site_settings" USING btree ("updated_at");
  CREATE INDEX "site_settings_created_at_idx" ON "site_settings" USING btree ("created_at");
  CREATE INDEX "buyer_signups_property_types_order_idx" ON "buyer_signups_property_types" USING btree ("order");
  CREATE INDEX "buyer_signups_property_types_parent_idx" ON "buyer_signups_property_types" USING btree ("parent_id");
  CREATE UNIQUE INDEX "buyer_signups_s3_object_key_idx" ON "buyer_signups" USING btree ("s3_object_key");
  CREATE INDEX "buyer_signups_email_hash_idx" ON "buyer_signups" USING btree ("email_hash");
  CREATE INDEX "buyer_signups_updated_at_idx" ON "buyer_signups" USING btree ("updated_at");
  CREATE INDEX "buyer_signups_created_at_idx" ON "buyer_signups" USING btree ("created_at");
  CREATE INDEX "buyer_signups_rels_order_idx" ON "buyer_signups_rels" USING btree ("order");
  CREATE INDEX "buyer_signups_rels_parent_idx" ON "buyer_signups_rels" USING btree ("parent_id");
  CREATE INDEX "buyer_signups_rels_path_idx" ON "buyer_signups_rels" USING btree ("path");
  CREATE INDEX "buyer_signups_rels_markets_id_idx" ON "buyer_signups_rels" USING btree ("markets_id");
  CREATE UNIQUE INDEX "deal_interest_s3_object_key_idx" ON "deal_interest" USING btree ("s3_object_key");
  CREATE INDEX "deal_interest_deal_idx" ON "deal_interest" USING btree ("deal_id");
  CREATE INDEX "deal_interest_deal_slug_idx" ON "deal_interest" USING btree ("deal_slug");
  CREATE INDEX "deal_interest_email_hash_idx" ON "deal_interest" USING btree ("email_hash");
  CREATE INDEX "deal_interest_updated_at_idx" ON "deal_interest" USING btree ("updated_at");
  CREATE INDEX "deal_interest_created_at_idx" ON "deal_interest" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_markets_id_idx" ON "payload_locked_documents_rels" USING btree ("markets_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_deals_id_idx" ON "payload_locked_documents_rels" USING btree ("deals_id");
  CREATE INDEX "payload_locked_documents_rels_site_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("site_settings_id");
  CREATE INDEX "payload_locked_documents_rels_buyer_signups_id_idx" ON "payload_locked_documents_rels" USING btree ("buyer_signups_id");
  CREATE INDEX "payload_locked_documents_rels_deal_interest_id_idx" ON "payload_locked_documents_rels" USING btree ("deal_interest_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_rels" CASCADE;
  DROP TABLE "markets" CASCADE;
  DROP TABLE "pages_sections" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "faqs" CASCADE;
  DROP TABLE "deals" CASCADE;
  DROP TABLE "deals_rels" CASCADE;
  DROP TABLE "site_settings_navigation" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "buyer_signups_property_types" CASCADE;
  DROP TABLE "buyer_signups" CASCADE;
  DROP TABLE "buyer_signups_rels" CASCADE;
  DROP TABLE "deal_interest" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_media_access_policy";
  DROP TYPE "public"."enum_media_media_status";
  DROP TYPE "public"."enum_markets_county";
  DROP TYPE "public"."enum_pages_sections_section_type";
  DROP TYPE "public"."enum_pages_surface";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum_faqs_surface";
  DROP TYPE "public"."enum_faqs_status";
  DROP TYPE "public"."enum_deals_deal_type";
  DROP TYPE "public"."enum_deals_website_visibility";
  DROP TYPE "public"."enum_deals_deal_status";
  DROP TYPE "public"."enum_deals_property_details_occupancy";
  DROP TYPE "public"."enum_site_settings_navigation_surface";
  DROP TYPE "public"."enum_site_settings_surface";
  DROP TYPE "public"."enum_buyer_signups_property_types";
  DROP TYPE "public"."enum_buyer_signups_buyer_type";
  DROP TYPE "public"."enum_buyer_signups_purchase_method";
  DROP TYPE "public"."enum_buyer_signups_source";
  DROP TYPE "public"."enum_buyer_signups_s3_first_status";
  DROP TYPE "public"."enum_buyer_signups_ghl_sync_status";
  DROP TYPE "public"."enum_deal_interest_source";
  DROP TYPE "public"."enum_deal_interest_s3_first_status";
  DROP TYPE "public"."enum_deal_interest_ghl_sync_status";
  DROP TYPE "public"."enum_deal_interest_alert_status";`)
}
