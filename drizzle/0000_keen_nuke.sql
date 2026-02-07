CREATE TYPE "public"."tenant_status" AS ENUM('active', 'inactive', 'suspended', 'pending');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"settings" jsonb,
	"entity_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "tenants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "idx_tenant_code" ON "tenants" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_tenant_status" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tenant_deleted_at" ON "tenants" USING btree ("deleted_at");