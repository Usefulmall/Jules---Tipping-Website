import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, employers, workers, transactions, platformSettings, Employer, Worker, Transaction, PlatformSettings } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ EMPLOYER FUNCTIONS ============

export async function createEmployer(data: Omit<Employer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employer | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(employers).values(data);
  const id = (result as any).insertId;
  
  return {
    id,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getEmployers(): Promise<Employer[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(employers).where(eq(employers.status, 'active'));
}

export async function getEmployerById(id: number): Promise<Employer | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(employers).where(eq(employers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateEmployer(id: number, data: Partial<Employer>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(employers).set(data).where(eq(employers.id, id));
}

// ============ WORKER FUNCTIONS ============

export async function createWorker(data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt' | 'totalTipsReceived'>): Promise<Worker | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(workers).values({
    ...data,
    totalTipsReceived: '0',
  });
  const id = (result as any).insertId;

  return {
    id,
    ...data,
    totalTipsReceived: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getWorkerById(id: number): Promise<Worker | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getWorkerByUniqueUrl(uniqueUrl: string): Promise<Worker | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(workers).where(eq(workers.uniqueUrl, uniqueUrl)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getWorkersByEmployer(employerId: number): Promise<Worker[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(workers).where(eq(workers.employerId, employerId));
}

export async function getAllWorkers(): Promise<Worker[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(workers);
}

export async function updateWorker(id: number, data: Partial<Worker>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(workers).set(data).where(eq(workers.id, id));
}

// ============ TRANSACTION FUNCTIONS ============

export async function createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(transactions).values(data);
  const id = (result as any).insertId;

  return {
    id,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getTransactionByReference(reference: string): Promise<Transaction | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(transactions).where(eq(transactions.paystackReference, reference)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateTransaction(id: number, data: Partial<Transaction>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(transactions).set(data).where(eq(transactions.id, id));
}

export async function getTransactionsByWorker(workerId: number): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(transactions).where(eq(transactions.workerId, workerId));
}

export async function getTransactionsByEmployer(employerId: number): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(transactions).where(eq(transactions.employerId, employerId));
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(transactions);
}

export async function getCompletedTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(transactions).where(eq(transactions.status, 'completed'));
}

// ============ PLATFORM SETTINGS FUNCTIONS ============

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(platformSettings).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getPlatformSettings();
  if (existing) {
    await db.update(platformSettings).set(data).where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values(data as any);
  }
}
