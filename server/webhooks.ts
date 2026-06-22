import { Express, Request, Response } from "express";
import { verifyPaystackWebhookSignature } from "./paystack";
import * as db from "./db";
import { ENV } from "./_core/env";

interface PaystackWebhookEvent {
  event: string;
  data?: {
    id?: number;
    reference?: string;
    amount?: number;
    status?: string;
    customer?: {
      id: number;
      email: string;
    };
    metadata?: {
      transactionId?: number;
      workerId?: number;
      workerName?: string;
      customerMessage?: string;
    };
  };
}

/**
 * Register Paystack webhook endpoint
 * Paystack will POST to /api/paystack/webhook with signature verification
 */
export function registerPaystackWebhook(app: Express) {
  app.post("/api/paystack/webhook", async (req: Request, res: Response) => {
    try {
      // Get the raw body for signature verification
      const signature = req.headers["x-paystack-signature"] as string;

      if (!signature) {
        console.warn("[Webhook] Missing x-paystack-signature header");
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Verify signature
      const rawBody = JSON.stringify(req.body);
      const isValid = verifyPaystackWebhookSignature(rawBody, signature);

      if (!isValid) {
        console.warn("[Webhook] Invalid signature");
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const event = req.body as PaystackWebhookEvent;

      // Handle different event types
      switch (event.event) {
        case "charge.success":
          await handleChargeSuccess(event);
          break;
        case "charge.failed":
          await handleChargeFailed(event);
          break;
        default:
          console.log(`[Webhook] Unhandled event type: ${event.event}`);
      }

      // Always respond with 200 to acknowledge receipt
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Webhook] Error processing webhook:", error);
      // Still return 200 to prevent Paystack retries
      return res.status(200).json({ success: false, error: "Processing error" });
    }
  });
}

/**
 * Handle successful charge event from Paystack
 */
async function handleChargeSuccess(event: PaystackWebhookEvent) {
  try {
    if (!event.data?.reference) {
      console.warn("[Webhook] charge.success event missing reference");
      return;
    }

    const reference = event.data.reference;

    // Get the transaction from database
    const transaction = await db.getTransactionByReference(reference);

    if (!transaction) {
      console.warn(`[Webhook] Transaction not found for reference: ${reference}`);
      return;
    }

    // Update transaction status to completed
    await db.updateTransaction(transaction.id, {
      status: "completed",
      paystackResponse: JSON.stringify(event.data),
    });

    // Update worker's total tips received
    const worker = await db.getWorkerById(transaction.workerId);
    if (worker && worker.totalTipsReceived) {
      const currentTotal = parseFloat(worker.totalTipsReceived.toString());
      const newTotal = currentTotal + parseFloat(transaction.workerAmount.toString());
      await db.updateWorker(worker.id, {
        totalTipsReceived: newTotal.toString(),
      });
    }

    console.log(`[Webhook] Transaction ${transaction.id} marked as completed`);
  } catch (error) {
    console.error("[Webhook] Error handling charge.success:", error);
  }
}

/**
 * Handle failed charge event from Paystack
 */
async function handleChargeFailed(event: PaystackWebhookEvent) {
  try {
    if (!event.data?.reference) {
      console.warn("[Webhook] charge.failed event missing reference");
      return;
    }

    const reference = event.data.reference;

    // Get the transaction from database
    const transaction = await db.getTransactionByReference(reference);

    if (!transaction) {
      console.warn(`[Webhook] Transaction not found for reference: ${reference}`);
      return;
    }

    // Update transaction status to failed
    await db.updateTransaction(transaction.id, {
      status: "failed",
      paystackResponse: JSON.stringify(event.data),
    });

    console.log(`[Webhook] Transaction ${transaction.id} marked as failed`);
  } catch (error) {
    console.error("[Webhook] Error handling charge.failed:", error);
  }
}
