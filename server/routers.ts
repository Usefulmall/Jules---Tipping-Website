import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as paystack from "./paystack";
import { nanoid } from "nanoid";
import { BankNameSchema, getBankCode, BANKS } from "./modules/bankValidation";

// ============ VALIDATION SCHEMAS ============

const CreateEmployerSchema = z.object({
  name: z.string().min(1, "Employer name is required"),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});

const CreateWorkerSchema = z.object({
  employerId: z.number().int().positive(),
  fullName: z.string().min(1, "Full name is required"),
  role: z.string().min(1, "Role is required"),
  phoneNumber: z.string().optional(),
  idNumber: z.string().optional(),
  bankName: BankNameSchema,
  accountHolder: z.string().min(1, "Account holder name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  branchCode: z.string().min(1, "Branch code is required"),
  notes: z.string().optional(),
});

const InitializePaymentSchema = z.object({
  workerUniqueUrl: z.string().min(1),
  tipAmount: z.number().positive(),
  customerEmail: z.string().email(),
  customerMessage: z.string().optional(),
});

// ============ HELPER FUNCTIONS ============

function getBaseUrl(req: any) {
  // Try to get origin from headers
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.origin;
    } catch (e) {
      // Ignore invalid URLs
    }
  }
  // Fallback to environment variable or localhost
  return process.env.VITE_FRONTEND_URL || "http://localhost:3000";
}

// ============ HELPER PROCEDURES ============

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ============ ROUTERS ============

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ EMPLOYER ROUTES ============
  employers: router({
    list: adminProcedure.query(async () => {
      return db.getEmployers();
    }),

    create: adminProcedure.input(CreateEmployerSchema).mutation(async ({ input }) => {
      const employer = await db.createEmployer({
        name: input.name,
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
        address: input.address || null,
        city: input.city || null,
        province: input.province || null,
        status: "active",
      });
      if (!employer) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create employer" });
      }
      return employer;
    }),

    getById: adminProcedure.input(z.number()).query(async ({ input }) => {
      const employer = await db.getEmployerById(input);
      if (!employer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Employer not found" });
      }
      return employer;
    }),

    update: adminProcedure.input(z.object({
      id: z.number(),
      data: CreateEmployerSchema.partial(),
    })).mutation(async ({ input }) => {
      await db.updateEmployer(input.id, input.data);
      return db.getEmployerById(input.id);
    }),

    deactivate: adminProcedure.input(z.number()).mutation(async ({ input }) => {
      await db.updateEmployer(input, { status: "inactive" });
      return { success: true };
    }),
  }),

  // ============ WORKER ROUTES ============
  workers: router({
    // Public: Get worker by unique URL (for tip page)
    getByUrl: publicProcedure.input(z.string()).query(async ({ input }) => {
      const worker = await db.getWorkerByUniqueUrl(input);
      if (!worker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Worker not found" });
      }
      // Fetch employer details
      const employer = await db.getEmployerById(worker.employerId);
      return {
        ...worker,
        employer: employer ? { id: employer.id, name: employer.name, city: employer.city } : null,
      };
    }),

    // Admin: List all workers
    list: adminProcedure.query(async () => {
      return db.getAllWorkers();
    }),

    // Admin: Create new worker (with Paystack sub-account)
    create: adminProcedure.input(CreateWorkerSchema).mutation(async ({ input }) => {
      // Verify employer exists
      const employer = await db.getEmployerById(input.employerId);
      if (!employer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Employer not found" });
      }

      // Create Paystack sub-account with correct bank code from unified module
      const paystackBankCode = getBankCode(input.bankName);
      const paystackResult = await paystack.createPaystackSubaccount(
        input.fullName,
        input.bankName,
        input.accountNumber,
        paystackBankCode,
        input.accountHolder
      );

      if (!paystackResult.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: paystackResult.error });
      }

      // Generate unique URL
      const uniqueUrl = `${nanoid(12)}`;

      // Create worker in database
      const worker = await db.createWorker({
        employerId: input.employerId,
        fullName: input.fullName,
        role: input.role,
        phoneNumber: input.phoneNumber ?? "",
        idNumber: input.idNumber ?? "",
        bankName: input.bankName,
        accountHolder: input.accountHolder,
        accountNumber: input.accountNumber,
        branchCode: input.branchCode,
        paystackSubaccountCode: paystackResult.subaccountCode || "",
        uniqueUrl,
        status: "active",
        notes: input.notes || "",
      });

      if (!worker) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create worker" });
      }

      return worker;
    }),

    // Admin: Get worker by ID
    getById: adminProcedure.input(z.number()).query(async ({ input }) => {
      const worker = await db.getWorkerById(input);
      if (!worker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Worker not found" });
      }
      return worker;
    }),

    // Admin: Update worker
    update: adminProcedure.input(z.object({
      id: z.number(),
      data: CreateWorkerSchema.partial(),
    })).mutation(async ({ input }) => {
      await db.updateWorker(input.id, input.data);
      return db.getWorkerById(input.id);
    }),

    // Admin: Deactivate worker
    deactivate: adminProcedure.input(z.number()).mutation(async ({ input }) => {
      await db.updateWorker(input, { status: "inactive" });
      return { success: true };
    }),

    // Admin: Get workers by employer
    getByEmployer: adminProcedure.input(z.number()).query(async ({ input }) => {
      return db.getWorkersByEmployer(input);
    }),
  }),

  // ============ PAYMENT ROUTES ============
  payments: router({
    // Public: Initialize payment for a worker
    initialize: publicProcedure.input(InitializePaymentSchema).mutation(async ({ input }) => {
      // Get worker
      const worker = await db.getWorkerByUniqueUrl(input.workerUniqueUrl);
      if (!worker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Worker not found" });
      }

      if (worker.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Worker is not active" });
      }

      if (!worker.paystackSubaccountCode) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Worker payment account not configured" });
      }

      // Get platform settings for commission
      const settings = await db.getPlatformSettings();
      const commissionPercentage = settings && settings.commissionPercentage ? parseFloat(settings.commissionPercentage.toString()) : 2;

      // Calculate amounts
      const platformCommission = (input.tipAmount * commissionPercentage) / 100;
      const workerAmount = input.tipAmount - platformCommission;

      // Create transaction record (pending)
      const transaction = await db.createTransaction({
        workerId: worker.id,
        employerId: worker.employerId,
        paystackReference: `pending-${nanoid(12)}`,
        tipAmount: input.tipAmount.toString(),
        platformCommission: platformCommission.toString(),
        workerAmount: workerAmount.toString(),
        customerMessage: input.customerMessage || null,
        status: "pending",
        paystackResponse: "",
      });

      if (!transaction) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create transaction" });
      }

      // Initialize Paystack payment
      const paystackResult = await paystack.initializePaystackPayment(
        input.customerEmail,
        input.tipAmount,
        worker.paystackSubaccountCode,
        {
          transactionId: transaction.id,
          workerId: worker.id,
          workerName: worker.fullName,
          customerMessage: input.customerMessage,
        }
      );

      if (!paystackResult.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: paystackResult.error });
      }

      // Update transaction with Paystack reference
      if (paystackResult.reference) {
        await db.updateTransaction(transaction.id, {
          paystackReference: paystackResult.reference,
        });
      }

      return {
        authorizationUrl: paystackResult.authorizationUrl,
        reference: paystackResult.reference,
      };
    }),

    // Admin: Get all transactions
    listTransactions: adminProcedure.query(async () => {
      return db.getAllTransactions();
    }),

    // Admin: Get transactions for a worker
    getWorkerTransactions: adminProcedure.input(z.number()).query(async ({ input }) => {
      return db.getTransactionsByWorker(input);
    }),

    // Admin: Get transactions for an employer
    getEmployerTransactions: adminProcedure.input(z.number()).query(async ({ input }) => {
      return db.getTransactionsByEmployer(input);
    }),
  }),

  // ============ SETTINGS ROUTES ============
  settings: router({
    get: adminProcedure.query(async () => {
      const settings = await db.getPlatformSettings();
      return settings || {
        id: 0,
        commissionPercentage: "2",
        platformName: "Tipping Platform",
        platformLogo: null,
        minTipAmount: "1",
        maxTipAmount: "5000",
        updatedAt: new Date(),
      };
    }),

    update: adminProcedure.input(z.object({
      commissionPercentage: z.number().min(0).max(100).optional(),
      platformName: z.string().optional(),
      platformLogo: z.string().optional(),
      minTipAmount: z.number().positive().optional(),
      maxTipAmount: z.number().positive().optional(),
    })).mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.commissionPercentage !== undefined) updateData.commissionPercentage = input.commissionPercentage.toString();
      if (input.platformName !== undefined) updateData.platformName = input.platformName;
      if (input.platformLogo !== undefined) updateData.platformLogo = input.platformLogo;
      if (input.minTipAmount !== undefined) updateData.minTipAmount = input.minTipAmount.toString();
      if (input.maxTipAmount !== undefined) updateData.maxTipAmount = input.maxTipAmount.toString();
      await db.updatePlatformSettings(updateData as any);
      return db.getPlatformSettings();
    }),
  }),

  // ============ PDF DOWNLOAD ROUTES ============
  pdf: router({
    downloadWorkerCard: publicProcedure.input(z.number()).query(async ({ ctx, input }) => {
      const worker = await db.getWorkerById(input);
      if (!worker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Worker not found" });
      }

      const { generateTipCard } = await import("./pdf-generator");
      const pdfBuffer = await generateTipCard({
        workerName: worker.fullName,
        role: worker.role,
        centre: `Employer ${worker.employerId}`,
        tipUrl: `${getBaseUrl(ctx.req)}/tip/${worker.uniqueUrl}`,
      });

      return {
        success: true,
        buffer: pdfBuffer.toString("base64"),
        filename: `${worker.fullName.replace(/\s+/g, "_")}_tip_card.pdf`,
      };
    }),
    generateTipCard: publicProcedure.input(z.object({
      workerUrl: z.string().min(1),
    })).query(async ({ ctx, input }) => {
      const worker = await db.getWorkerByUniqueUrl(input.workerUrl);
      if (!worker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Worker not found" });
      }

      const { generateTipCard } = await import("./pdf-generator");
      const pdfBuffer = await generateTipCard({
        workerName: worker.fullName,
        role: worker.role,
        centre: `Employer ${worker.employerId}`,
        tipUrl: `${getBaseUrl(ctx.req)}/tip/${worker.uniqueUrl}`,
      });

      return {
        success: true,
        buffer: pdfBuffer.toString("base64"),
        filename: `${worker.fullName.replace(/\s+/g, "_")}_tip_card.pdf`,
      };
    }),
  }),

  // ============ QR CODE ROUTES ============
  qrcode: router({
    generate: publicProcedure.input(z.object({
      url: z.string().url(),
    })).query(async ({ input }) => {
      try {
        const QRCode = await import("qrcode");
        const qrDataUrl = await QRCode.toDataURL(input.url, {
          errorCorrectionLevel: "H",
          type: "image/png",
          width: 300,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        return {
          success: true,
          data: qrDataUrl,
        };
      } catch (error) {
        console.error("QR code generation error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate QR code" });
      }
    }),
  }),

  // ============ ANALYTICS ROUTES ============
  analytics: router({
    getPlatformEarnings: adminProcedure.query(async () => {
      const transactions = await db.getCompletedTransactions();
      const totalEarnings = transactions.reduce((sum, tx) => {
        return sum + parseFloat(tx.platformCommission.toString());
      }, 0);
      return {
        totalEarnings,
        totalTransactions: transactions.length,
        averageCommission: transactions.length > 0 ? totalEarnings / transactions.length : 0,
      };
    }),

    getWorkerEarnings: adminProcedure.input(z.number()).query(async ({ input }) => {
      const transactions = await db.getTransactionsByWorker(input);
      const completed = transactions.filter((tx) => tx.status === "completed");
      const totalEarnings = completed.reduce((sum, tx) => sum + parseFloat(tx.workerAmount.toString()), 0);
      return {
        totalEarnings,
        transactionCount: completed.length,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
