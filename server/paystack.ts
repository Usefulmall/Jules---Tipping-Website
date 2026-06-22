import { ENV } from "./_core/env";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface PaystackSubaccountPayload {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  business_contact: string;
  percentage_charge?: number;
  subaccount_code?: string;
}

interface PaystackSubaccountResponse {
  status: boolean;
  message: string;
  data?: {
    subaccount_code: string;
    business_name: string;
    [key: string]: unknown;
  };
}

interface PaystackInitializePaymentPayload {
  email: string;
  amount: number; // in kobo (ZAR cents)
  metadata?: Record<string, unknown>;
  subaccount?: string;
}

interface PaystackInitializePaymentResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyPaymentResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    reference: string;
    amount: number;
    status: string;
    customer?: {
      id: number;
      email: string;
    };
    [key: string]: unknown;
  };
}

/**
 * Create or update a Paystack sub-account for a worker
 * Sub-accounts allow automatic split payments between worker and platform
 */
export async function createPaystackSubaccount(
  workerName: string,
  bankName: string,
  accountNumber: string,
  bankCode: string,
  accountHolder: string
): Promise<{ success: boolean; subaccountCode?: string; error?: string }> {
  try {
    // Debug: Check if secret key is loaded
    if (!ENV.paystackSecretKey) {
      console.error("[Paystack] ERROR: PAYSTACK_SECRET_KEY is not set in environment");
      return {
        success: false,
        error: "Paystack secret key is not configured. Please contact support.",
      };
    }
    console.log("[Paystack] Secret key loaded, length:", ENV.paystackSecretKey.length);

    const payload: PaystackSubaccountPayload = {
      business_name: workerName,
      settlement_bank: bankCode,
      account_number: accountNumber.replace(/\s/g, ""),
      business_contact: accountHolder,
      percentage_charge: 2,
    };

    console.log("[Paystack] Creating sub-account:", { workerName, bankName, bankCode, accountNumber });

    const response = await fetch(`${PAYSTACK_BASE_URL}/subaccount`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.paystackSecretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as PaystackSubaccountResponse;

    console.log("[Paystack] Response:", { status: response.status, message: data.message });

    if (!data.status) {
      console.error("[Paystack] Error:", data.message);
      return {
        success: false,
        error: data.message || "Failed to create Paystack sub-account",
      };
    }

    return {
      success: true,
      subaccountCode: data.data?.subaccount_code,
    };
  } catch (error) {
    console.error("[Paystack] Error creating sub-account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initialize a payment via Paystack
 * Returns authorization URL for redirect or popup checkout
 */
export async function initializePaystackPayment(
  email: string,
  amountInZAR: number,
  workerSubaccountCode: string,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; authorizationUrl?: string; reference?: string; error?: string }> {
  try {
    // Convert ZAR to kobo (multiply by 100)
    const amountInKobo = Math.round(amountInZAR * 100);

    const payload: PaystackInitializePaymentPayload = {
      email,
      amount: amountInKobo,
      subaccount: workerSubaccountCode,
      metadata,
    };

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.paystackSecretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as PaystackInitializePaymentResponse;

    if (!data.status) {
      return {
        success: false,
        error: data.message || "Failed to initialize payment",
      };
    }

    return {
      success: true,
      authorizationUrl: data.data?.authorization_url,
      reference: data.data?.reference,
    };
  } catch (error) {
    console.error("[Paystack] Error initializing payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify a payment with Paystack
 */
export async function verifyPaystackPayment(
  reference: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ENV.paystackSecretKey}`,
      },
    });

    const data = (await response.json()) as PaystackVerifyPaymentResponse;

    if (!data.status) {
      return {
        success: false,
        error: data.message || "Failed to verify payment",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("[Paystack] Error verifying payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify webhook signature from Paystack
 */
export function verifyPaystackWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", ENV.paystackSecretKey)
    .update(body)
    .digest("hex");
  return hash === signature;
}
