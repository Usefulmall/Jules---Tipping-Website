import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { BANKS } from "../server/modules/bankValidation";
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Employers/centres table - represents shopping centres or workplaces
 */
export const employers = mysqlTable("employers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 100 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employer = typeof employers.$inferSelect;
export type InsertEmployer = typeof employers.$inferInsert;

/**
 * Workers table - individual workers who receive tips
 */
export const workers = mysqlTable("workers", {
  id: int("id").autoincrement().primaryKey(),
  employerId: int("employerId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(), // e.g., "car guard", "cleaner", "security"
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().default(""),
  idNumber: varchar("idNumber", { length: 50 }).notNull().default(""), // SA ID or work permit number
  bankName: mysqlEnum("bankName", BANKS).notNull(), // SA bank name
  accountHolder: varchar("accountHolder", { length: 255 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 50 }).notNull(),
  branchCode: varchar("branchCode", { length: 10 }).notNull(),
  paystackSubaccountCode: varchar("paystackSubaccountCode", { length: 255 }).notNull().default(""), // Paystack sub-account code
  uniqueUrl: varchar("uniqueUrl", { length: 255 }).notNull().unique(), // Unique URL slug for public tip page
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  totalTipsReceived: decimal("totalTipsReceived", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;

/**
 * Transactions table - records all tip transactions
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").notNull(),
  employerId: int("employerId").notNull(),
  paystackReference: varchar("paystackReference", { length: 255 }).notNull().unique(),
  tipAmount: decimal("tipAmount", { precision: 10, scale: 2 }).notNull(), // ZAR
  platformCommission: decimal("platformCommission", { precision: 10, scale: 2 }).notNull(), // 2% of tipAmount
  workerAmount: decimal("workerAmount", { precision: 10, scale: 2 }).notNull(), // tipAmount - platformCommission
  customerMessage: text("customerMessage"),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  paystackResponse: text("paystackResponse").notNull(), // Store full Paystack response as JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Platform settings table - stores configuration like commission percentage
 */
export const platformSettings = mysqlTable("platformSettings", {
  id: int("id").autoincrement().primaryKey(),
  commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("2"),
  platformName: varchar("platformName", { length: 255 }).default("Tipping Platform"),
  platformLogo: text("platformLogo"), // URL to logo
  minTipAmount: decimal("minTipAmount", { precision: 10, scale: 2 }).default("1"),
  maxTipAmount: decimal("maxTipAmount", { precision: 10, scale: 2 }).default("5000"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;
