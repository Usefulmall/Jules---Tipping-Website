import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("Paystack API Keys Validation", () => {
  it("should have Paystack secret key configured", () => {
    expect(ENV.paystackSecretKey).toBeDefined();
    expect(ENV.paystackSecretKey).toBeTruthy();
    expect(ENV.paystackSecretKey).toContain("sk_live");
  });

  it("should have Paystack public key configured", () => {
    expect(ENV.paystackPublicKey).toBeDefined();
    expect(ENV.paystackPublicKey).toBeTruthy();
    expect(ENV.paystackPublicKey).toContain("pk_live");
  });

  it("should validate API key format", () => {
    // Paystack live keys follow specific format patterns
    const secretKeyPattern = /^sk_live_[a-f0-9]{32,}$/;
    const publicKeyPattern = /^pk_live_[a-f0-9]{32,}$/;

    expect(secretKeyPattern.test(ENV.paystackSecretKey)).toBe(true);
    expect(publicKeyPattern.test(ENV.paystackPublicKey)).toBe(true);
  });

  it("should have valid API key lengths", () => {
    // Paystack live keys are typically 40+ characters
    expect(ENV.paystackSecretKey.length).toBeGreaterThan(30);
    expect(ENV.paystackPublicKey.length).toBeGreaterThan(30);
  });

  it("should confirm keys are live (not test) keys", () => {
    expect(ENV.paystackSecretKey.startsWith("sk_live_")).toBe(true);
    expect(ENV.paystackPublicKey.startsWith("pk_live_")).toBe(true);
    
    // Ensure they're not test keys
    expect(ENV.paystackSecretKey.includes("sk_test")).toBe(false);
    expect(ENV.paystackPublicKey.includes("pk_test")).toBe(false);
  });
});
