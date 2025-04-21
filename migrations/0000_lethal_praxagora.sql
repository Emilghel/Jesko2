CREATE TABLE "agent_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"system_prompt" text NOT NULL,
	"voice_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_default" boolean DEFAULT false,
	CONSTRAINT "agent_templates_template_id_unique" UNIQUE("template_id")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"phone_number" text DEFAULT '' NOT NULL,
	"system_prompt" text DEFAULT 'You are a helpful assistant.' NOT NULL,
	"voice_id" text DEFAULT 'EXAVITQu4vr4xnSDxMaL' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"memory" text DEFAULT '[]',
	"user_id" integer,
	"interaction_count" integer DEFAULT 0,
	"last_interaction" timestamp,
	"template_id" text,
	"voice_recognition_enabled" boolean DEFAULT true,
	"voice_recognition_language" text DEFAULT 'en-US',
	"voice_recognition_continuous" boolean DEFAULT false,
	"voice_recognition_interim_results" boolean DEFAULT true,
	"voice_recognition_max_alternatives" integer DEFAULT 1,
	"voice_recognition_profanity_filter" boolean DEFAULT false,
	CONSTRAINT "agents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "api_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"request_count" integer NOT NULL,
	"response_time" double precision,
	"character_count" integer,
	"agent_id" integer,
	"token_count" integer,
	"endpoint" text,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_sid" text NOT NULL,
	"phone_number" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"status" text NOT NULL,
	"recording_url" text,
	"recording_sid" text,
	"agent_id" integer,
	"transcript" text,
	CONSTRAINT "calls_call_sid_unique" UNIQUE("call_sid")
);
--> statement-breakpoint
CREATE TABLE "coin_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"package_id" text,
	"payment_id" text
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp NOT NULL,
	"level" text NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"referral_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"commission_amount" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_date" timestamp,
	"payment_id" integer
);
--> statement-breakpoint
CREATE TABLE "partner_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text NOT NULL,
	"transaction_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"referral_code" text NOT NULL,
	"commission_rate" double precision DEFAULT 0.2 NOT NULL,
	"earnings_balance" double precision DEFAULT 0 NOT NULL,
	"total_earnings" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payment_info" json,
	"bio" text,
	"website" text,
	"logo_url" text,
	CONSTRAINT "partners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "partners_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "personality_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"personality_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"prompt_text" text NOT NULL,
	"icon" text DEFAULT 'brain',
	"color" text DEFAULT 'cyan',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true,
	"model_config" text DEFAULT '{"temperature": 0.7, "top_p": 1.0}',
	"voice_id" text,
	"order" integer DEFAULT 0,
	CONSTRAINT "personality_prompts_personality_id_unique" UNIQUE("personality_id")
);
--> statement-breakpoint
CREATE TABLE "purchased_phone_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"friendly_name" text,
	"phone_sid" text,
	"is_active" boolean DEFAULT true,
	"purchase_date" timestamp DEFAULT now() NOT NULL,
	"monthly_cost" double precision DEFAULT 4.87,
	"capabilities" text DEFAULT '{"voice":true,"sms":true}',
	"assigned_to_agent_id" integer,
	"region" text,
	"country_code" text DEFAULT 'US',
	CONSTRAINT "purchased_phone_numbers_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"referred_user_id" integer NOT NULL,
	"referral_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"first_purchase_date" timestamp,
	"total_purchases" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "referrals_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE "site_statistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_statistics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"phone_number_id" integer,
	"system_prompt" text NOT NULL,
	"personality_id" text,
	"voice_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp,
	"is_active" boolean DEFAULT true,
	"greeting_message" text DEFAULT 'Hello, how can I help you today?',
	"greeting_message_required" boolean DEFAULT true,
	"second_message" text DEFAULT '',
	"second_message_required" boolean DEFAULT false,
	"third_message" text DEFAULT '',
	"third_message_required" boolean DEFAULT false,
	"custom_settings" text,
	"call_count" integer DEFAULT 0,
	"total_duration" integer DEFAULT 0,
	"avatar_url" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp,
	"is_admin" boolean DEFAULT false NOT NULL,
	"coins" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_transaction_id_coin_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."coin_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_payment_id_partner_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."partner_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payments" ADD CONSTRAINT "partner_payments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchased_phone_numbers" ADD CONSTRAINT "purchased_phone_numbers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_phone_number_id_purchased_phone_numbers_id_fk" FOREIGN KEY ("phone_number_id") REFERENCES "public"."purchased_phone_numbers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_personality_id_personality_prompts_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality_prompts"("personality_id") ON DELETE no action ON UPDATE no action;