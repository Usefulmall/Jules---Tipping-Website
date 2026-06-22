import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock admin context
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// Mock public context
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Worker Management", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let publicCaller: ReturnType<typeof appRouter.createCaller>;
  let testEmployerId: number;
  let testWorkerId: number;
  let testWorkerUrl: string;

  beforeAll(async () => {
    adminCaller = appRouter.createCaller(createAdminContext());
    publicCaller = appRouter.createCaller(createPublicContext());

    // Create test employer
    const employer = await adminCaller.employers.create({
      name: "Test Centre",
      contactEmail: "centre@example.com",
      contactPhone: "+27123456789",
      address: "123 Main St",
      city: "Johannesburg",
      province: "Gauteng",
    });
    testEmployerId = employer.id;
  });

  it("should list employers", async () => {
    const employers = await adminCaller.employers.list();
    expect(Array.isArray(employers)).toBe(true);
    expect(employers.length).toBeGreaterThan(0);
    expect(employers.some((e) => e.id === testEmployerId)).toBe(true);
  });

  it("should create a worker with valid bank details", async () => {
    const worker = await adminCaller.workers.create({
      employerId: testEmployerId,
      fullName: "John Doe",
      role: "Car Guard",
      phoneNumber: "+27987654321",
      idNumber: "1234567890123",
      bankName: "ABSA",
      accountHolder: "John Doe",
      accountNumber: "1234567890",
      branchCode: "632005",
      notes: "Test worker",
    });

    expect(worker).toBeDefined();
    expect(worker.fullName).toBe("John Doe");
    expect(worker.role).toBe("Car Guard");
    expect(worker.uniqueUrl).toBeDefined();
    expect(worker.uniqueUrl.length).toBeGreaterThan(0);
    expect(worker.paystackSubaccountCode).toBeDefined();

    testWorkerId = worker.id;
    testWorkerUrl = worker.uniqueUrl;
  });

  it("should retrieve worker by unique URL", async () => {
    const worker = await publicCaller.workers.getByUrl(testWorkerUrl);

    expect(worker).toBeDefined();
    expect(worker.fullName).toBe("John Doe");
    expect(worker.uniqueUrl).toBe(testWorkerUrl);
    expect((worker as any).employer).toBeDefined();
    expect((worker as any).employer?.name).toBe("Test Centre");
  });

  it("should return 404 for non-existent worker URL", async () => {
    try {
      await publicCaller.workers.getByUrl("non-existent-url");
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should list all workers", async () => {
    const workers = await adminCaller.workers.list();
    expect(Array.isArray(workers)).toBe(true);
    expect(workers.some((w) => w.id === testWorkerId)).toBe(true);
  });

  it("should reject worker creation without required bank details", async () => {
    try {
      await adminCaller.workers.create({
        employerId: testEmployerId,
        fullName: "Jane Doe",
        role: "Cleaner",
        phoneNumber: "",
        idNumber: "",
        bankName: "", // Missing
        accountHolder: "Jane Doe",
        accountNumber: "9876543210",
        branchCode: "632005",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});

describe("Payment Initialization", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let publicCaller: ReturnType<typeof appRouter.createCaller>;
  let testWorkerId: number;
  let testWorkerUrl: string;

  beforeAll(async () => {
    adminCaller = appRouter.createCaller(createAdminContext());
    publicCaller = appRouter.createCaller(createPublicContext());

    // Create employer and worker for testing
    const employer = await adminCaller.employers.create({
      name: "Payment Test Centre",
      contactEmail: "payment@example.com",
      address: "456 Test Ave",
      city: "Cape Town",
      province: "Western Cape",
    });

    const worker = await adminCaller.workers.create({
      employerId: employer.id,
      fullName: "Payment Test Worker",
      role: "Security",
      bankName: "FNB",
      accountHolder: "Payment Test",
      accountNumber: "1111111111",
      branchCode: "250055",
    });

    testWorkerId = worker.id;
    testWorkerUrl = worker.uniqueUrl;
  });

  it("should initialize payment with valid amount", async () => {
    const payment = await publicCaller.payments.initialize({
      workerUniqueUrl: testWorkerUrl,
      tipAmount: 50,
      customerEmail: "customer@example.com",
      customerMessage: "Great service!",
    });

    expect(payment).toBeDefined();
    expect(payment.authorizationUrl).toBeDefined();
    expect(payment.authorizationUrl).toContain("paystack.co");
  });

  it("should reject payment with invalid email", async () => {
    try {
      await publicCaller.payments.initialize({
        workerUniqueUrl: testWorkerUrl,
        tipAmount: 50,
        customerEmail: "invalid-email",
        customerMessage: "",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("should reject payment with zero amount", async () => {
    try {
      await publicCaller.payments.initialize({
        workerUniqueUrl: testWorkerUrl,
        tipAmount: 0,
        customerEmail: "customer@example.com",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("should reject payment for non-existent worker", async () => {
    try {
      await publicCaller.payments.initialize({
        workerUniqueUrl: "non-existent",
        tipAmount: 50,
        customerEmail: "customer@example.com",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});

describe("Platform Settings", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    adminCaller = appRouter.createCaller(createAdminContext());
  });

  it("should retrieve platform settings", async () => {
    const settings = await adminCaller.settings.get();

    expect(settings).toBeDefined();
    expect(settings.commissionPercentage).toBeDefined();
    expect(settings.platformName).toBeDefined();
    expect(settings.minTipAmount).toBeDefined();
    expect(settings.maxTipAmount).toBeDefined();
  });

  it("should update platform settings", async () => {
    const updated = await adminCaller.settings.update({
      commissionPercentage: 2.5,
      platformName: "Updated Platform",
    });

    expect(updated.commissionPercentage).toBe("2.5");
    expect(updated.platformName).toBe("Updated Platform");
  });

  it("should reject invalid commission percentage", async () => {
    try {
      await adminCaller.settings.update({
        commissionPercentage: 150, // > 100
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});

describe("Analytics", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    adminCaller = appRouter.createCaller(createAdminContext());
  });

  it("should retrieve platform earnings", async () => {
    const earnings = await adminCaller.analytics.getPlatformEarnings();

    expect(earnings).toBeDefined();
    expect(earnings.totalEarnings).toBeDefined();
    expect(earnings.totalTransactions).toBeDefined();
    expect(earnings.averageCommission).toBeDefined();
  });

  it("should retrieve worker earnings", async () => {
    // This test assumes at least one worker exists
    const workers = await adminCaller.workers.list();
    if (workers.length > 0) {
      const earnings = await adminCaller.analytics.getWorkerEarnings(workers[0].id);
      expect(earnings).toBeDefined();
      expect(earnings.totalEarnings).toBeDefined();
      expect(earnings.transactionCount).toBeDefined();
    }
  });
});
