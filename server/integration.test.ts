import { describe, it, expect } from "vitest";
import { generateQRCode, generateQRCodeBuffer } from "./qrcode";
import { generateTipCard, generateTipCardSheet } from "./pdf-generator";

describe("QR Code Generation", () => {
  it("should generate QR code as data URL", async () => {
    const qrCode = await generateQRCode("https://example.com/tip/test123");
    expect(qrCode).toBeDefined();
    expect(qrCode).toContain("data:image/png");
  });

  it("should generate QR code buffer", async () => {
    const buffer = await generateQRCodeBuffer("https://example.com/tip/test456");
    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should handle custom QR code options", async () => {
    const qrCode = await generateQRCode("https://example.com/tip/custom", {
      width: 300,
      margin: 3,
    });
    expect(qrCode).toBeDefined();
    expect(qrCode).toContain("data:image/png");
  });
});

describe("PDF Generation", () => {
  it("should generate single tip card PDF", async () => {
    const pdfBuffer = await generateTipCard({
      workerName: "John Doe",
      role: "Car Guard",
      centre: "Main Centre",
      tipUrl: "https://example.com/tip/john-doe-123",
    });

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(pdfBuffer.toString("utf-8", 0, 4)).toBe("%PDF");
  });

  it("should generate tip card sheet with multiple cards", async () => {
    const cards = [
      {
        workerName: "John Doe",
        role: "Car Guard",
        centre: "Main Centre",
        tipUrl: "https://example.com/tip/john-doe-123",
      },
      {
        workerName: "Jane Smith",
        role: "Cleaner",
        centre: "Main Centre",
        tipUrl: "https://example.com/tip/jane-smith-456",
      },
      {
        workerName: "Bob Johnson",
        role: "Security",
        centre: "Branch Centre",
        tipUrl: "https://example.com/tip/bob-johnson-789",
      },
    ];

    const pdfBuffer = await generateTipCardSheet(cards);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(pdfBuffer.toString("utf-8", 0, 4)).toBe("%PDF");
  });

  it("should handle empty card list", async () => {
    const pdfBuffer = await generateTipCardSheet([]);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it("should handle large card list", async () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      workerName: `Worker ${i + 1}`,
      role: `Role ${i + 1}`,
      centre: "Test Centre",
      tipUrl: `https://example.com/tip/worker-${i + 1}`,
    }));

    const pdfBuffer = await generateTipCardSheet(cards);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });
});

describe("Data Validation", () => {
  it("should validate email format", () => {
    const validEmails = [
      "test@example.com",
      "user+tag@domain.co.za",
      "name.surname@company.org",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it("should reject invalid email formats", () => {
    const invalidEmails = [
      "notanemail",
      "@example.com",
      "user@",
      "user @example.com",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it("should validate South African ID number format", () => {
    // SA ID format: 13 digits (YYMMDDGGGGGCC)
    const validIds = [
      "8001015009087", // Valid format
      "9912315001088", // Valid format
    ];

    const idRegex = /^\d{13}$/;

    validIds.forEach((id) => {
      expect(idRegex.test(id)).toBe(true);
    });
  });

  it("should validate bank account number", () => {
    // South African bank account numbers are typically 10-11 digits
    const validAccounts = ["1234567890", "12345678901"];

    const accountRegex = /^\d{10,11}$/;

    validAccounts.forEach((account) => {
      expect(accountRegex.test(account)).toBe(true);
    });
  });

  it("should validate branch code format", () => {
    // South African branch codes are 6 digits
    const validCodes = ["632005", "250055", "001001"];

    const codeRegex = /^\d{6}$/;

    validCodes.forEach((code) => {
      expect(codeRegex.test(code)).toBe(true);
    });
  });
});

describe("URL Slug Generation", () => {
  it("should generate valid URL slugs", () => {
    const generateSlug = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    };

    expect(generateSlug("John Doe")).toBe("john-doe");
    expect(generateSlug("Jane Smith")).toBe("jane-smith");
    expect(generateSlug("Bob O'Brien")).toBe("bob-obrien");
    expect(generateSlug("Maria García")).toBe("maria-garca");
  });
});

describe("Commission Calculation", () => {
  it("should calculate 2% platform commission correctly", () => {
    const calculateCommission = (tipAmount: number, commissionPercentage: number = 2) => {
      return (tipAmount * commissionPercentage) / 100;
    };

    expect(calculateCommission(100)).toBe(2);
    expect(calculateCommission(50)).toBe(1);
    expect(calculateCommission(1000)).toBe(20);
    expect(calculateCommission(25.50)).toBeCloseTo(0.51, 2);
  });

  it("should calculate worker amount after commission", () => {
    const calculateWorkerAmount = (tipAmount: number, commissionPercentage: number = 2) => {
      const commission = (tipAmount * commissionPercentage) / 100;
      return tipAmount - commission;
    };

    expect(calculateWorkerAmount(100)).toBe(98);
    expect(calculateWorkerAmount(50)).toBe(49);
    expect(calculateWorkerAmount(1000)).toBe(980);
  });

  it("should handle edge cases in commission calculation", () => {
    const calculateCommission = (tipAmount: number, commissionPercentage: number = 2) => {
      return Math.round((tipAmount * commissionPercentage) / 100 * 100) / 100;
    };

    // Test rounding
    expect(calculateCommission(33.33)).toBe(0.67);
    expect(calculateCommission(0.01)).toBe(0);
    expect(calculateCommission(1)).toBe(0.02);
  });
});
