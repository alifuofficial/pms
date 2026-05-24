import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export type VerifyResponse = {
  success: boolean;
  message: string;
  requestId?: string;
  verification?: {
    processingStatus: "queued" | "running" | "completed" | "failed";
    status?: "success" | "failed" | "not_found" | "pending";
    verified?: boolean;
  };
  data?: Array<{
    amount: number;
    senderName?: string;
    referenceNumber: string;
    status: string;
    verified: boolean;
  }>;
};

/**
 * Triggers a live verification request to Verify.ET API.
 * Uses universal smart routing or explicit bank if provided.
 */
export async function triggerPaymentVerification(params: {
  referenceNumber: string;
  bank?: string;
  accountSuffix?: string;
  phoneNumber?: string;
}) {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    
    if (!settings?.verifyEtEnabled || !settings?.verifyEtApiKey) {
      console.info("[Verify.ET] Automatic payment verification is disabled or not configured.");
      return { success: false, error: "Service disabled or not configured." };
    }

    const payload: any = {
      reference: params.referenceNumber,
    };
    if (params.bank) payload.bank = params.bank.toLowerCase();
    if (params.accountSuffix) payload.suffix = params.accountSuffix;
    if (params.phoneNumber) payload.phoneNumber = params.phoneNumber;

    console.info(`[Verify.ET] Submitting verification for reference: ${params.referenceNumber}...`);

    const response = await fetch("https://verify.et/api/verify?waitMs=5000", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.verifyEtApiKey,
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as VerifyResponse;

    if (!response.ok && response.status !== 202) {
      console.error("[Verify.ET] Request failed:", body.message);
      return { success: false, error: body.message || "Request failed" };
    }

    return { success: true, response: body, status: response.status };
  } catch (error: any) {
    console.error("[Verify.ET] Network/Internal Error:", error);
    return { success: false, error: error?.message || "Internal error occurred" };
  }
}

/**
 * Perform real-time check and auto-approval if the reference matches instantly.
 */
export async function checkAndVerifyPaymentVerifyEt(paymentId: string, transactionId: string) {
  if (!transactionId) return;
  try {
    const result = await triggerPaymentVerification({ referenceNumber: transactionId });
    if (result.success && result.status === 200) {
      const body = result.response;
      if (
        body?.verification?.verified === true &&
        body?.verification?.processingStatus === "completed"
      ) {
        console.info(`[Verify.ET Inline] Transaction ${transactionId} verified successfully. Auto-approving payment ${paymentId}...`);
        const { approvePaymentSystem } = await import("@/lib/actions/payments");
        await approvePaymentSystem(paymentId);
      }
    }
  } catch (err) {
    console.error("[Verify.ET Inline Check Error]:", err);
  }
}
