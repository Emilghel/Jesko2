import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json, uuid, inet, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  phoneNumber: text("phone_number"), // Added phone number field
  registrationIp: text("registration_ip"), // Added registration IP for rate limiting
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  coins: integer("coins").default(100).notNull(), // Start with 100 coins
  profession: text("profession"), // Character profession/type selection
  stripe_customer_id: text("stripe_customer_id"), // Stripe customer ID for payment processing
  googleId: text("google_id"), // Google ID for OAuth authentication
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callSid: text("call_sid").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  status: text("status").notNull(),
  recordingUrl: text("recording_url"),
  recordingSid: text("recording_sid"),
  agentId: integer("agent_id"),
  transcript: text("transcript"),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  level: text("level").notNull(),
  source: text("source").notNull(),
  message: text("message").notNull(),
});

export const apiMetrics = pgTable("api_metrics", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  requestCount: integer("request_count").notNull(),
  responseTime: doublePrecision("response_time"),  // Using doublePrecision for floating point numbers
  characterCount: integer("character_count"),
  agentId: integer("agent_id"),
  tokenCount: integer("token_count"),
  endpoint: text("endpoint"),
  timestamp: timestamp("timestamp").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  displayName: true,
  phoneNumber: true,
  registrationIp: true,
  isAdmin: true,
  lastLogin: true,
  profession: true,
  googleId: true,
});

export const insertCallSchema = createInsertSchema(calls).pick({
  callSid: true,
  phoneNumber: true,
  status: true,
  recordingUrl: true,
  recordingSid: true,
  agentId: true,
  transcript: true,
});

export const insertLogSchema = createInsertSchema(logs).pick({
  level: true,
  source: true,
  message: true,
  timestamp: true,
});

export const insertApiMetricSchema = createInsertSchema(apiMetrics).pick({
  service: true,
  requestCount: true,
  responseTime: true,
  characterCount: true,
  agentId: true,
  tokenCount: true,
  endpoint: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

export type InsertApiMetric = z.infer<typeof insertApiMetricSchema>;
export type ApiMetric = typeof apiMetrics.$inferSelect;

export enum LogLevel {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export enum CallStatus {
  INITIATED = "initiated",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  phone_number: text("phone_number").notNull().default(""),
  system_prompt: text("system_prompt").notNull().default("You are a helpful assistant."),
  voice_id: text("voice_id").notNull().default("EXAVITQu4vr4xnSDxMaL"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  active: boolean("active").notNull().default(true),
  // Store agent state and memory as JSON
  memory: text("memory").default("[]"),
  // Reference to the user who owns this agent (one user -> one agent)
  user_id: integer("user_id").references(() => users.id).unique(),
  // Track interactions for stats and recovery
  interaction_count: integer("interaction_count").default(0),
  last_interaction: timestamp("last_interaction"),
  // For creating agents from templates
  template_id: text("template_id"),
  
  // Voice recognition settings
  voice_recognition_enabled: boolean("voice_recognition_enabled").default(true),
  voice_recognition_language: text("voice_recognition_language").default("en-US"),
  voice_recognition_continuous: boolean("voice_recognition_continuous").default(false),
  voice_recognition_interim_results: boolean("voice_recognition_interim_results").default(true),
  voice_recognition_max_alternatives: integer("voice_recognition_max_alternatives").default(1),
  voice_recognition_profanity_filter: boolean("voice_recognition_profanity_filter").default(false),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  description: true,
  phone_number: true,
  system_prompt: true,
  voice_id: true,
  active: true,
  memory: true,
  user_id: true,
  interaction_count: true,
  last_interaction: true,
  template_id: true,
  // Voice recognition settings
  voice_recognition_enabled: true,
  voice_recognition_language: true,
  voice_recognition_continuous: true,
  voice_recognition_interim_results: true,
  voice_recognition_max_alternatives: true,
  voice_recognition_profanity_filter: true,
});

// Create a table for agent templates
export const agentTemplates = pgTable("agent_templates", {
  id: serial("id").primaryKey(),
  template_id: text("template_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  system_prompt: text("system_prompt").notNull(),
  voice_id: text("voice_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  is_default: boolean("is_default").default(false),
});

export const insertTemplateSchema = createInsertSchema(agentTemplates).pick({
  template_id: true,
  name: true,
  description: true,
  system_prompt: true,
  voice_id: true,
  is_default: true,
});

// AI Personality Prompts table for predefined personality prompts
export const personalityPrompts = pgTable("personality_prompts", {
  id: serial("id").primaryKey(),
  personality_id: text("personality_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  prompt_text: text("prompt_text").notNull(),
  icon: text("icon").default("brain"),
  color: text("color").default("cyan"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  is_active: boolean("is_active").default(true),
  // Fields for integration with AI APIs
  model_config: text("model_config").default('{"temperature": 0.7, "top_p": 1.0}'),
  voice_id: text("voice_id"),  // Reference to the voice used by this personality
  order: integer("order").default(0),  // For sorting personalities in the UI
});

export const insertPersonalityPromptSchema = createInsertSchema(personalityPrompts).pick({
  personality_id: true,
  name: true,
  description: true,
  prompt_text: true,
  icon: true,
  color: true,
  is_active: true,
  model_config: true,
  voice_id: true,
  order: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type AgentTemplate = typeof agentTemplates.$inferSelect;
export type InsertPersonalityPrompt = z.infer<typeof insertPersonalityPromptSchema>;
export type PersonalityPrompt = typeof personalityPrompts.$inferSelect;

// User purchased phone numbers
export const purchasedPhoneNumbers = pgTable("purchased_phone_numbers", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  phone_number: text("phone_number").notNull().unique(),
  friendly_name: text("friendly_name"),
  phone_sid: text("phone_sid"),
  is_active: boolean("is_active").default(true),
  purchase_date: timestamp("purchase_date").defaultNow().notNull(),
  monthly_cost: doublePrecision("monthly_cost").default(4.87),
  capabilities: text("capabilities").default('{"voice":true,"sms":true}'),
  assigned_to_agent_id: integer("assigned_to_agent_id"),
  region: text("region"),
  country_code: text("country_code").default("US"),
});

export const insertPhoneNumberSchema = createInsertSchema(purchasedPhoneNumbers).pick({
  user_id: true,
  phone_number: true,
  friendly_name: true,
  phone_sid: true,
  is_active: true,
  monthly_cost: true,
  capabilities: true,
  assigned_to_agent_id: true,
  region: true,
  country_code: true,
  purchase_date: true,
});

// Users can create multiple AI agents
export const userAgents = pgTable("user_agents", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  phone_number_id: integer("phone_number_id").references(() => purchasedPhoneNumbers.id),
  system_prompt: text("system_prompt").notNull(),
  personality_id: text("personality_id").references(() => personalityPrompts.personality_id),
  voice_id: text("voice_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  last_active: timestamp("last_active"),
  is_active: boolean("is_active").default(true),
  greeting_message: text("greeting_message").default("Hello, how can I help you today?"),
  greeting_message_required: boolean("greeting_message_required").default(true),
  second_message: text("second_message").default(""),
  second_message_required: boolean("second_message_required").default(false),
  third_message: text("third_message").default(""),
  third_message_required: boolean("third_message_required").default(false),
  custom_settings: text("custom_settings"),
  call_count: integer("call_count").default(0),
  total_duration: integer("total_duration").default(0),
  avatar_url: text("avatar_url"),
  knowledge_base: text("knowledge_base"), // Store domain-specific knowledge for the agent
});

export const insertUserAgentSchema = createInsertSchema(userAgents).pick({
  user_id: true,
  name: true,
  description: true,
  phone_number_id: true,
  system_prompt: true,
  personality_id: true,
  voice_id: true,
  is_active: true,
  greeting_message: true,
  greeting_message_required: true,
  second_message: true,
  second_message_required: true,
  third_message: true,
  third_message_required: true,
  custom_settings: true,
  avatar_url: true,
  knowledge_base: true,
});

export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;
export type PurchasedPhoneNumber = typeof purchasedPhoneNumbers.$inferSelect;
export type InsertUserAgent = z.infer<typeof insertUserAgentSchema>;
export type UserAgent = typeof userAgents.$inferSelect;

// Member counter for global site statistics
export const siteStatistics = pgTable("site_statistics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  value: integer("value").notNull().default(0),
  last_updated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertSiteStatisticSchema = createInsertSchema(siteStatistics).pick({
  name: true,
  value: true,
});

export type InsertSiteStatistic = z.infer<typeof insertSiteStatisticSchema>;
export type SiteStatistic = typeof siteStatistics.$inferSelect;

// Coin transactions table to track purchases and usage
export const coinTransactions = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(), // Positive for purchases, negative for usage
  description: text("description").notNull(),
  type: text("type").notNull(), // "purchase", "usage", "refund", etc. (column in DB is 'type', not 'transaction_type')
  created_at: timestamp("created_at").defaultNow().notNull(),
  package_id: text("package_id"), // For purchases, store which package was bought (100, 500, 5000)
  payment_id: text("payment_id"), // For tracking payment transactions
});

export const insertCoinTransactionSchema = createInsertSchema(coinTransactions).pick({
  user_id: true,
  amount: true,
  description: true,
  type: true, // Changed from 'transaction_type' to match the column name in the table
  package_id: true,
  payment_id: true,
});

export type InsertCoinTransaction = z.infer<typeof insertCoinTransactionSchema>;
export type CoinTransaction = typeof coinTransactions.$inferSelect;

// Define transaction types enum
export enum TransactionType {
  PURCHASE = "purchase",
  USAGE = "usage",
  REFUND = "refund",
  BONUS = "bonus",
}

// Define coin package options
export enum CoinPackage {
  SMALL = "100",
  MEDIUM = "500",
  LARGE = "5000",
}

// Stock videos table to store videos that can be downloaded
export const stockVideos = pgTable("stock_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  duration: integer("duration").notNull().default(5), // in seconds
  aspectRatio: text("aspect_ratio").notNull().default("16:9"),
  category: text("category").default("general"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id), // user who created/uploaded the video
  downloadCount: integer("download_count").default(0),
  isAIGenerated: boolean("is_ai_generated").default(true),
  promptUsed: text("prompt_used"),
  sourceImageUrl: text("source_image_url"),
  modelUsed: text("model_used").default("gen-2"),
});

export const insertStockVideoSchema = createInsertSchema(stockVideos).omit({
  id: true,
  createdAt: true,
  downloadCount: true,
});

export type InsertStockVideo = z.infer<typeof insertStockVideoSchema>;
export type StockVideo = typeof stockVideos.$inferSelect;

// Partners table to track users who can refer others
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull().unique(),
  company_name: text("company_name").notNull(),
  referral_code: text("referral_code").notNull().unique(),
  commission_rate: doublePrecision("commission_rate").default(0.10), // 10% by default
  status: text("status").notNull().default("PENDING"), // PENDING, ACTIVE, SUSPENDED
  created_at: timestamp("created_at").defaultNow().notNull(),
  website: text("website"),
  logo_url: text("logo_url"),
  contact_email: text("contact_email"),
  contact_phone: text("contact_phone"),
  total_referrals: integer("total_referrals").default(0),
  total_earnings: doublePrecision("total_earnings").default(0),
  total_withdrawals: doublePrecision("total_withdrawals").default(0),
  available_balance: doublePrecision("available_balance").default(0),
  tier: text("tier").default("BASIC"), // BASIC, SILVER, GOLD, PLATINUM
  notes: text("notes"),
  last_payment_date: timestamp("last_payment_date"),
  country: text("country"),
  tax_id: text("tax_id"),
});

export const insertPartnerSchema = createInsertSchema(partners).pick({
  user_id: true,
  company_name: true,
  referral_code: true,
  commission_rate: true,
  status: true,
  website: true,
  logo_url: true,
  contact_email: true,
  contact_phone: true,
  tier: true,
  notes: true,
  country: true,
  tax_id: true,
});

export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;

// User referrals table to track where users came from
export const userReferrals = pgTable("user_referrals", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull().unique(),
  partner_id: integer("partner_id").references(() => partners.id),
  referral_code: text("referral_code").notNull(),
  signup_date: timestamp("signup_date").defaultNow().notNull(),
  first_purchase_date: timestamp("first_purchase_date"),
  total_spend: doublePrecision("total_spend").default(0),
  commission_paid: doublePrecision("commission_paid").default(0),
  status: text("status").default("ACTIVE"), // ACTIVE, INACTIVE, FRAUD
});

export const insertUserReferralSchema = createInsertSchema(userReferrals).pick({
  user_id: true,
  partner_id: true,
  referral_code: true,
  first_purchase_date: true,
  total_spend: true,
  commission_paid: true,
  status: true,
});

export type InsertUserReferral = z.infer<typeof insertUserReferralSchema>;
export type UserReferral = typeof userReferrals.$inferSelect;

// Partner payouts table to track partner payments
export const partnerPayouts = pgTable("partner_payouts", {
  id: serial("id").primaryKey(),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED
  payment_method: text("payment_method").notNull(), // PAYPAL, BANK_TRANSFER, etc.
  transaction_id: text("transaction_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  processed_at: timestamp("processed_at"),
  notes: text("notes"),
  payment_details: text("payment_details"), // JSON with payment details
});

export const insertPartnerPayoutSchema = createInsertSchema(partnerPayouts).pick({
  partner_id: true,
  amount: true,
  status: true,
  payment_method: true,
  transaction_id: true,
  notes: true,
  payment_details: true,
});

export type InsertPartnerPayout = z.infer<typeof insertPartnerPayoutSchema>;
export type PartnerPayout = typeof partnerPayouts.$inferSelect;

// Partner tokens and access tokens
export const partnerTokens = pgTable("partner_tokens", {
  id: serial("id").primaryKey(),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  token: text("token").notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at"),
  last_used_at: timestamp("last_used_at"),
  is_active: boolean("is_active").default(true),
  token_type: text("token_type").default("API_KEY"), // API_KEY, ACCESS_TOKEN, etc.
  permissions: text("permissions").default("[]"), // JSON array of permission strings
  ip_restriction: text("ip_restriction"), // Optional IP restriction
});

export const insertPartnerTokenSchema = createInsertSchema(partnerTokens).pick({
  partner_id: true,
  token: true,
  expires_at: true,
  is_active: true,
  token_type: true,
  permissions: true,
  ip_restriction: true,
});

export type InsertPartnerToken = z.infer<typeof insertPartnerTokenSchema>;
export type PartnerToken = typeof partnerTokens.$inferSelect;

// Discount codes for promo campaigns
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discount_percent: integer("discount_percent").notNull().default(10),
  max_uses: integer("max_uses").default(100),
  current_uses: integer("current_uses").default(0),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  is_active: boolean("is_active").default(true),
  description: text("description"),
  partner_id: integer("partner_id").references(() => partners.id), // Optional link to a partner
  min_purchase_amount: integer("min_purchase_amount").default(0), // Minimum purchase amount in coins
  campaign_name: text("campaign_name"), // For grouping discount codes
});

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).pick({
  code: true,
  discount_percent: true,
  max_uses: true,
  expires_at: true,
  is_active: true,
  description: true,
  partner_id: true,
  min_purchase_amount: true,
  campaign_name: true,
});

export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodes.$inferSelect;

// Used discount codes to track which users have used which codes
export const usedDiscountCodes = pgTable("used_discount_codes", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  discount_code_id: integer("discount_code_id").references(() => discountCodes.id).notNull(),
  used_at: timestamp("used_at").defaultNow().notNull(),
  transaction_id: integer("transaction_id").references(() => coinTransactions.id),
  discount_amount: integer("discount_amount").notNull(), // Amount discounted in coins
  purchase_amount: integer("purchase_amount").notNull(), // Total amount of purchase in coins
});

export const insertUsedDiscountCodeSchema = createInsertSchema(usedDiscountCodes).pick({
  user_id: true,
  discount_code_id: true,
  transaction_id: true,
  discount_amount: true,
  purchase_amount: true,
});

export type InsertUsedDiscountCode = z.infer<typeof insertUsedDiscountCodeSchema>;
export type UsedDiscountCode = typeof usedDiscountCodes.$inferSelect;

// Lead table for managing contacts
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name"),
  email: text("email"),
  phone_number: text("phone_number"),
  company: text("company"),
  job_title: text("job_title"),
  source: text("source").default("MANUAL"), // MANUAL, IMPORT, API, etc.
  status: text("status").default("NEW"), // NEW, CONTACTED, QUALIFIED, CUSTOMER, etc.
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  last_contacted: timestamp("last_contacted"),
  custom_fields: text("custom_fields").default("{}"), // JSON object with custom fields
  tags: text("tags").array(),
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  user_id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone_number: true,
  company: true,
  job_title: true,
  source: true,
  status: true,
  notes: true,
  custom_fields: true,
  tags: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Lead calls for tracking calls to leads
export const leadCalls = pgTable("lead_calls", {
  id: serial("id").primaryKey(),
  lead_id: integer("lead_id").references(() => leads.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  call_time: timestamp("call_time").defaultNow().notNull(),
  duration: integer("duration"), // in seconds
  outcome: text("outcome"), // ANSWERED, VOICEMAIL, NO_ANSWER, etc.
  notes: text("notes"),
  recording_url: text("recording_url"),
  agent_id: integer("agent_id").references(() => userAgents.id), // If call made by AI agent
  transcript: text("transcript"),
  call_type: text("call_type").default("OUTBOUND"), // OUTBOUND, INBOUND, AUTOMATED
  call_sid: text("call_sid"), // For tracking Twilio calls
});

export const insertLeadCallSchema = createInsertSchema(leadCalls).pick({
  lead_id: true,
  user_id: true,
  call_time: true,
  duration: true,
  outcome: true,
  notes: true,
  recording_url: true,
  agent_id: true,
  transcript: true,
  call_type: true,
  call_sid: true,
});

export type InsertLeadCall = z.infer<typeof insertLeadCallSchema>;
export type LeadCall = typeof leadCalls.$inferSelect;

// Custom automated call settings
export const automatedCallSettings = pgTable("automated_call_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  agent_id: integer("agent_id").references(() => userAgents.id).notNull(),
  leads_filter: text("leads_filter").default("{}"), // JSON criteria for selecting leads
  schedule_type: text("schedule_type").default("ONE_TIME"), // ONE_TIME, DAILY, WEEKLY, MONTHLY
  schedule_time: text("schedule_time"), // "HH:MM" format for daily/weekly/monthly
  schedule_days: text("schedule_days").array(), // Array of days of week for weekly: ["MON", "WED", "FRI"]
  next_run_time: timestamp("next_run_time"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  max_calls_per_run: integer("max_calls_per_run").default(10),
  call_delay: integer("call_delay").default(60), // seconds between calls
  timezone: text("timezone").default("UTC"),
});

export const insertAutomatedCallSettingsSchema = createInsertSchema(automatedCallSettings).pick({
  user_id: true,
  name: true,
  description: true,
  agent_id: true,
  leads_filter: true,
  schedule_type: true,
  schedule_time: true,
  schedule_days: true,
  next_run_time: true,
  is_active: true,
  max_calls_per_run: true,
  call_delay: true,
  timezone: true,
});

export type InsertAutomatedCallSettings = z.infer<typeof insertAutomatedCallSettingsSchema>;
export type AutomatedCallSettings = typeof automatedCallSettings.$inferSelect;

// Automated call runs to track batches of automated calls
export const automatedCallRuns = pgTable("automated_call_runs", {
  id: serial("id").primaryKey(),
  settings_id: integer("settings_id").references(() => automatedCallSettings.id).notNull(),
  start_time: timestamp("start_time").defaultNow().notNull(),
  end_time: timestamp("end_time"),
  status: text("status").default("RUNNING"), // SCHEDULED, RUNNING, COMPLETED, FAILED, CANCELLED
  total_calls: integer("total_calls").default(0),
  successful_calls: integer("successful_calls").default(0),
  failed_calls: integer("failed_calls").default(0),
  error_message: text("error_message"),
  run_log: text("run_log").default("[]"), // JSON array of log messages
});

export const insertAutomatedCallRunSchema = createInsertSchema(automatedCallRuns).pick({
  settings_id: true,
  end_time: true,
  status: true,
  total_calls: true,
  successful_calls: true,
  failed_calls: true,
  error_message: true,
  run_log: true,
});

export type InsertAutomatedCallRun = z.infer<typeof insertAutomatedCallRunSchema>;
export type AutomatedCallRun = typeof automatedCallRuns.$inferSelect;

// SEO Keywords for the app
export const seoKeywords = pgTable("seo_keywords", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull().unique(),
  relevance_score: integer("relevance_score").default(50), // 0-100 relevance score
  search_volume: integer("search_volume"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  is_active: boolean("is_active").default(true),
  category: text("category").default("general"),
  notes: text("notes"),
});

export const insertSeoKeywordSchema = createInsertSchema(seoKeywords).pick({
  keyword: true,
  relevance_score: true,
  search_volume: true,
  is_active: true,
  category: true,
  notes: true,
});

export type InsertSeoKeyword = z.infer<typeof insertSeoKeywordSchema>;
export type SeoKeyword = typeof seoKeywords.$inferSelect;

// User calendar integrations
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  provider: text("provider").notNull(), // GOOGLE, OFFICE365, etc.
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  token_expires: timestamp("token_expires"),
  calendar_id: text("calendar_id"),
  calendar_name: text("calendar_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  is_active: boolean("is_active").default(true),
  scopes: text("scopes"), // Comma-separated list of granted scopes
  last_synced: timestamp("last_synced"),
});

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;

// Calendar appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  lead_id: integer("lead_id").references(() => leads.id),
  title: text("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  location: text("location"),
  status: text("status").default("SCHEDULED"), // SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED
  calendar_integration_id: integer("calendar_integration_id").references(() => calendarIntegrations.id),
  external_event_id: text("external_event_id"), // ID in external calendar service
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  reminder_sent: boolean("reminder_sent").default(false),
  notes: text("notes"),
  appointment_type: text("appointment_type").default("MEETING"), // MEETING, CALL, DEMO, etc.
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
