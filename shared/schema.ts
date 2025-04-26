import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json, uuid, inet, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  // phoneNumber field removed as it doesn't exist in the database
  // phoneNumber: text("phone_number"),
  // registrationIp field removed as it doesn't exist in the database
  // registrationIp: text("registration_ip"), 
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
  // phoneNumber: true, // Removed because the column doesn't exist in the database
  // registrationIp: true, // Removed because the column doesn't exist in the database
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

// Video History table to store user-generated videos
export const videoHistory = pgTable("video_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  prompt: text("prompt").notNull(),
  modelVersion: text("model_version").notNull().default("gen-2"),
  aspectRatio: text("aspect_ratio").notNull().default("16:9"),
  duration: integer("duration").notNull().default(3), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Additional metadata
  motionStrength: doublePrecision("motion_strength"),
  sourceImageUrl: text("source_image_url"),
  isPublic: boolean("is_public").default(false),
  isInStockLibrary: boolean("is_in_stock_library").default(false),
  stockVideoId: integer("stock_video_id").references(() => stockVideos.id),
});

export const insertVideoHistorySchema = createInsertSchema(videoHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertVideoHistory = z.infer<typeof insertVideoHistorySchema>;
export type VideoHistory = typeof videoHistory.$inferSelect;

// Calendar Integration Tables
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  provider: text("provider").notNull(), // 'google', 'calendly', etc.
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  token_expiry: timestamp("token_expiry"),
  calendar_id: text("calendar_id"), // Primary calendar ID
  email: text("email").notNull(), // Email associated with the calendar
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  is_active: boolean("is_active").default(true),
  settings: jsonb("settings").default({}), // JSON for provider-specific settings
  last_synced: timestamp("last_synced"),
  display_name: text("display_name"), // User-friendly name for the calendar
});

// Scheduled appointments created by AI agents 
export const scheduledAppointments = pgTable("scheduled_appointments", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  agent_id: integer("agent_id").references(() => userAgents.id).notNull(),
  calendar_integration_id: integer("calendar_integration_id").references(() => calendarIntegrations.id).notNull(),
  lead_id: integer("lead_id"), // Optional reference to a lead
  title: text("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, rescheduled
  calendar_event_id: text("calendar_event_id"), // ID of the event in the external calendar
  meeting_link: text("meeting_link"), // For virtual meetings
  location: text("location"), // For in-person meetings
  attendees: jsonb("attendees").default([]), // Array of attendee emails/info
  reminders: jsonb("reminders").default([]), // Array of reminder settings
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_during_call_sid: text("created_during_call_sid"), // Call where this appointment was created
  notes: text("notes"), // Additional notes about the appointment
  custom_data: jsonb("custom_data").default({}), // For any additional data
});

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertScheduledAppointmentSchema = createInsertSchema(scheduledAppointments).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertScheduledAppointment = z.infer<typeof insertScheduledAppointmentSchema>;
export type ScheduledAppointment = typeof scheduledAppointments.$inferSelect;

// Enum for calendar providers
export enum CalendarProvider {
  GOOGLE = "google",
  CALENDLY = "calendly",
  OUTLOOK = "outlook",
}

// Enum for appointment status
export enum AppointmentStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  RESCHEDULED = "rescheduled",
  PENDING = "pending", // Waiting for confirmation
}

// Partner System Tables
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull().unique(),
  company_name: text("company_name").notNull(),
  contact_name: text("contact_name").notNull(),
  referral_code: text("referral_code").notNull().unique(),
  commission_rate: doublePrecision("commission_rate").notNull().default(0.2), // 20% commission by default
  earnings_balance: doublePrecision("earnings_balance").notNull().default(0),
  total_earnings: doublePrecision("total_earnings").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, active, suspended
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  payment_info: json("payment_info"),
  bio: text("bio"),
  website: text("website"),
  logo_url: text("logo_url"),
  stripe_account_id: text("stripe_account_id"), // Stripe connected account ID for partner payouts
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  referred_user_id: integer("referred_user_id").references(() => users.id).notNull().unique(),
  referral_code: text("referral_code").notNull(), // Store which referral code was used
  status: text("status").notNull().default("active"), // active, inactive
  created_at: timestamp("created_at").defaultNow().notNull(),
  first_purchase_date: timestamp("first_purchase_date"),
  total_purchases: doublePrecision("total_purchases").notNull().default(0),
});

export const partnerPayments = pgTable("partner_payments", {
  id: serial("id").primaryKey(),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  payment_date: timestamp("payment_date").defaultNow().notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  payment_method: text("payment_method").notNull(),
  transaction_id: text("transaction_id"),
  notes: text("notes"),
});

export const partnerCommissions = pgTable("partner_commissions", {
  id: serial("id").primaryKey(),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  referral_id: integer("referral_id").references(() => referrals.id),
  transaction_id: text("transaction_id").notNull(), // Now a string to support both coin transaction IDs and Stripe IDs
  amount: doublePrecision("amount").notNull(),
  commission_amount: doublePrecision("commission_amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, void
  created_at: timestamp("created_at").defaultNow().notNull(),
  paid_date: timestamp("paid_date"),
  payment_id: integer("payment_id").references(() => partnerPayments.id),
  payment_type: text("payment_type").default("coin").notNull(), // coin, stripe, paypal
  description: text("description"),
});

// Insert Schemas
export const insertPartnerSchema = createInsertSchema(partners).pick({
  user_id: true,
  company_name: true,
  contact_name: true,
  referral_code: true,
  commission_rate: true,
  status: true,
  payment_info: true,
  bio: true,
  website: true,
  logo_url: true,
});

export const insertReferralSchema = createInsertSchema(referrals).pick({
  partner_id: true,
  referred_user_id: true,
  referral_code: true,
  status: true,
  total_purchases: true,
});

export const insertPartnerPaymentSchema = createInsertSchema(partnerPayments).pick({
  partner_id: true,
  amount: true,
  status: true,
  payment_method: true,
  transaction_id: true,
  notes: true,
});

export const insertPartnerCommissionSchema = createInsertSchema(partnerCommissions).pick({
  partner_id: true,
  referral_id: true,
  transaction_id: true,
  amount: true,
  commission_amount: true,
  status: true,
  payment_id: true,
  payment_type: true,
  description: true,
});

// Table for tracking referral link clicks
export const referralClicks = pgTable("referral_clicks", {
  id: serial("id").primaryKey(),
  referral_code: text("referral_code").notNull(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  converted: boolean("converted").default(false).notNull(),
  conversion_timestamp: timestamp("conversion_timestamp"),
  conversion_user_id: integer("conversion_user_id").references(() => users.id),
  base_url: text("base_url").notNull(),
  custom_url: text("custom_url"),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  utm_source: text("utm_source"),
  utm_medium: text("utm_medium"),
  utm_campaign: text("utm_campaign"),
  utm_term: text("utm_term"),
  utm_content: text("utm_content"),
  referrer: text("referrer"),
});

// Table for saved referral links
export const savedReferralLinks = pgTable("saved_referral_links", {
  id: serial("id").primaryKey(),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  name: text("name").notNull(),
  base_url: text("base_url").notNull(),
  custom_url: text("custom_url"),
  full_url: text("full_url").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  campaign: text("campaign"),
  utm_source: text("utm_source"),
  utm_medium: text("utm_medium"),
  utm_campaign: text("utm_campaign"),
  utm_term: text("utm_term"),
  utm_content: text("utm_content"),
  click_count: integer("click_count").default(0).notNull(),
  conversion_count: integer("conversion_count").default(0).notNull(),
  last_used: timestamp("last_used"),
});

// Table for tracking referral conversions
export const referralConversions = pgTable("referral_conversions", {
  id: serial("id").primaryKey(),
  partner_id: integer("partner_id").references(() => partners.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  referral_code: text("referral_code").notNull(),
  conversion_type: text("conversion_type").notNull(), // signup, purchase, etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  value: doublePrecision("value").default(0), // monetary value if applicable
  utm_source: text("utm_source"),
  utm_medium: text("utm_medium"),
  utm_campaign: text("utm_campaign"),
  ip_address: text("ip_address"), // hashed IP to correlate with click
  conversion_page: text("conversion_page"), // page where conversion occurred
  referrer: text("referrer"), // referrer at time of conversion
});

export const insertReferralClickSchema = createInsertSchema(referralClicks).pick({
  referral_code: true,
  ip_address: true,
  user_agent: true,
  base_url: true,
  custom_url: true,
  partner_id: true,
  utm_source: true,
  utm_medium: true,
  utm_campaign: true,
  utm_term: true,
  utm_content: true,
  referrer: true,
});

export const insertReferralConversionSchema = createInsertSchema(referralConversions).pick({
  partner_id: true,
  user_id: true,
  referral_code: true,
  conversion_type: true,
  value: true,
  utm_source: true,
  utm_medium: true,
  utm_campaign: true,
  ip_address: true,
  conversion_page: true,
  referrer: true,
});

export const insertSavedReferralLinkSchema = createInsertSchema(savedReferralLinks).pick({
  partner_id: true,
  name: true,
  base_url: true,
  custom_url: true,
  full_url: true,
  campaign: true,
  utm_source: true,
  utm_medium: true,
  utm_campaign: true,
  utm_term: true,
  utm_content: true,
});

// Types
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertReferralClick = z.infer<typeof insertReferralClickSchema>;
export type ReferralClick = typeof referralClicks.$inferSelect;

export type InsertReferralConversion = z.infer<typeof insertReferralConversionSchema>;
export type ReferralConversion = typeof referralConversions.$inferSelect;

export type InsertSavedReferralLink = z.infer<typeof insertSavedReferralLinkSchema>;
export type SavedReferralLink = typeof savedReferralLinks.$inferSelect;

export type InsertPartnerPayment = z.infer<typeof insertPartnerPaymentSchema>;
export type PartnerPayment = typeof partnerPayments.$inferSelect;

export type InsertPartnerCommission = z.infer<typeof insertPartnerCommissionSchema>;
export type PartnerCommission = typeof partnerCommissions.$inferSelect;

// Partner status enum
export enum PartnerStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

// Referral status enum
export enum ReferralStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// Payment status enum
export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid"
}

// Commission status enum
export enum CommissionStatus {
  PENDING = "pending",
  PAID = "paid",
  VOID = "void",
}

// Type alias for partner commission status
export type PartnerCommissionStatus = "pending" | "paid" | "void";

// Payment type enum
export enum PaymentType {
  COIN = "coin",
  STRIPE = "stripe",
  PAYPAL = "paypal",
}

// Leads Management
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  full_name: text("full_name").notNull(),
  phone_number: text("phone_number").notNull(),
  email: text("email"),
  source: text("source").default("manual"), // manual, excel, google_sheets, etc.
  status: text("status").default("new").notNull(), // new, contacted, qualified, converted, rejected
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  last_contacted: timestamp("last_contacted"),
  tags: text("tags").array(),
});

// Insert Schema for Leads
export const insertLeadSchema = createInsertSchema(leads).pick({
  user_id: true,
  full_name: true,
  phone_number: true,
  email: true,
  source: true,
  status: true,
  notes: true,
  tags: true,
});

// Types for Leads
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Lead status enum
export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  CONVERTED = "converted",
  REJECTED = "rejected",
}

// Automated call settings and configurations
export const automatedCallSettings = pgTable("automated_call_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  agent_id: integer("agent_id").references(() => userAgents.id).notNull(),
  lead_statuses: text("lead_statuses").array().default(['new']).notNull(), // Which lead statuses to call
  frequency: text("frequency").default("daily").notNull(), // daily, weekly, once
  run_time: text("run_time").default("09:00").notNull(), // Time to run the automation (24h format)
  run_days: text("run_days").array(), // For weekly: which days to run (mon, tue, etc.)
  max_calls_per_run: integer("max_calls_per_run").default(5).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  last_run: timestamp("last_run"),
  next_run: timestamp("next_run"),
  active_campaign: boolean("active_campaign").default(false).notNull(),
});

// Call automation runs and logs
export const automatedCallRuns = pgTable("automated_call_runs", {
  id: serial("id").primaryKey(),
  settings_id: integer("settings_id").references(() => automatedCallSettings.id).notNull(),
  start_time: timestamp("start_time").defaultNow().notNull(),
  end_time: timestamp("end_time"),
  status: text("status").default("running").notNull(), // running, completed, failed
  leads_processed: integer("leads_processed").default(0).notNull(),
  calls_initiated: integer("calls_initiated").default(0).notNull(),
  calls_connected: integer("calls_connected").default(0).notNull(),
  calls_failed: integer("calls_failed").default(0).notNull(),
  error_message: text("error_message"),
});

// Insert Schema for Automated Call Settings
export const insertAutomatedCallSettingsSchema = createInsertSchema(automatedCallSettings).pick({
  user_id: true,
  name: true,
  enabled: true,
  agent_id: true,
  lead_statuses: true,
  frequency: true,
  run_time: true,
  run_days: true,
  max_calls_per_run: true,
  active_campaign: true,
});

// Insert Schema for Automated Call Runs
export const insertAutomatedCallRunsSchema = createInsertSchema(automatedCallRuns).pick({
  settings_id: true,
  status: true,
  leads_processed: true,
  calls_initiated: true,
  calls_connected: true,
  calls_failed: true,
  error_message: true,
});

// Types for Automated Call Settings
export type InsertAutomatedCallSettings = z.infer<typeof insertAutomatedCallSettingsSchema>;
export type AutomatedCallSettings = typeof automatedCallSettings.$inferSelect;

// Types for Automated Call Runs
export type InsertAutomatedCallRun = z.infer<typeof insertAutomatedCallRunsSchema>;
export type AutomatedCallRun = typeof automatedCallRuns.$inferSelect;

// Automation frequency enum
export enum AutomationFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  ONCE = "once",
}

// Automation status enum
export enum AutomationStatus {
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Lead calls table to store call history with transcripts for each lead
export const leadCalls = pgTable("lead_calls", {
  id: serial("id").primaryKey(),
  lead_id: integer("lead_id").references(() => leads.id).notNull(),
  call_sid: text("call_sid").notNull().unique(),
  agent_id: integer("agent_id").references(() => userAgents.id).notNull(),
  start_time: timestamp("start_time").defaultNow().notNull(),
  end_time: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  status: text("status").notNull().default(CallStatus.INITIATED),
  recording_url: text("recording_url"),
  recording_sid: text("recording_sid"),
  transcript: text("transcript"),
  call_summary: text("call_summary"), // AI-generated summary of the call
  call_notes: text("call_notes"), // Additional notes about the call
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schema for Lead Calls
export const insertLeadCallSchema = createInsertSchema(leadCalls).pick({
  lead_id: true,
  call_sid: true,
  agent_id: true,
  status: true,
  recording_url: true,
  recording_sid: true,
  transcript: true,
  call_summary: true,
  call_notes: true,
});

// Types for Lead Calls
export type InsertLeadCall = z.infer<typeof insertLeadCallSchema>;
export type LeadCall = typeof leadCalls.$inferSelect;

// SEO Keyword Tables

// SEO Keywords table
export const seoKeywords = pgTable("seo_keywords", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  text: text("text").notNull(),
  searchVolume: integer("search_volume"),
  difficulty: integer("difficulty"),
  status: text("status").notNull().default('new'),  // 'new', 'in-progress', 'published'
  notes: text("notes"),
  dateAdded: timestamp("date_added").defaultNow().notNull(),
  tags: text("tags").array(),
});

// Content Links table for SEO Keywords
export const contentLinks = pgTable("content_links", {
  id: serial("id").primaryKey(),
  keywordId: integer("keyword_id").references(() => seoKeywords.id).notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  publishDate: timestamp("publish_date").defaultNow().notNull(),
  notes: text("notes"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  clicks: integer("clicks").default(0),
  impressions: integer("impressions").default(0),
  position: doublePrecision("position"),
});

// Content Performance History table for tracking changes over time
export const contentPerformanceHistory = pgTable("content_performance_history", {
  id: serial("id").primaryKey(),
  content_link_id: integer("content_link_id").references(() => contentLinks.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  clicks: integer("clicks").default(0),
  position: doublePrecision("position"),
});

// Content Link Click Details - for more detailed tracking of each click
export const contentLinkClicks = pgTable("content_link_clicks", {
  id: serial("id").primaryKey(),
  content_link_id: integer("content_link_id").references(() => contentLinks.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  referrer: text("referrer"),
  utm_source: text("utm_source"),
  utm_medium: text("utm_medium"),
  utm_campaign: text("utm_campaign"),
  utm_term: text("utm_term"),
  utm_content: text("utm_content"),
  country: text("country"),
  city: text("city"),
  device_type: text("device_type"), // desktop, mobile, tablet
  browser: text("browser"),
  os: text("os"),
});

// Create insert schemas
export const insertSeoKeywordSchema = createInsertSchema(seoKeywords).omit({
  id: true,
  dateAdded: true,
});

export const insertContentLinkSchema = createInsertSchema(contentLinks).omit({
  id: true,
  publishDate: true,
  lastUpdated: true,
});

export const insertContentPerformanceHistorySchema = createInsertSchema(contentPerformanceHistory).omit({
  id: true,
  date: true,
});

export const insertContentLinkClickSchema = createInsertSchema(contentLinkClicks).omit({
  id: true,
  timestamp: true,
});

// Define types
export type InsertSeoKeyword = z.infer<typeof insertSeoKeywordSchema>;
export type SeoKeyword = typeof seoKeywords.$inferSelect;

export type InsertContentLink = z.infer<typeof insertContentLinkSchema>;
export type ContentLink = typeof contentLinks.$inferSelect;

export type InsertContentPerformanceHistory = z.infer<typeof insertContentPerformanceHistorySchema>;
export type ContentPerformanceHistory = typeof contentPerformanceHistory.$inferSelect;

export type InsertContentLinkClick = z.infer<typeof insertContentLinkClickSchema>;
export type ContentLinkClick = typeof contentLinkClicks.$inferSelect;

// SEO Keyword Status Enum
export enum SeoKeywordStatus {
  NEW = "new",
  IN_PROGRESS = "in-progress",
  PUBLISHED = "published",
}
