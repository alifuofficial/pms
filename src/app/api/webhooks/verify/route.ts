import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { approvePaymentSystem } from "@/lib/actions/payments";

export async function POST(req: NextRequest) {
  try {
    const timestamp = req.headers.get("X-Webhook-Timestamp") || "";
    const signature = req.headers.get("X-Webhook-Signature") || "";
    const rawBody = await req.text();

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });

    // ── Signature Verification ─────────────────────────────────
    if (settings?.verifyEtWebhookSecret && signature) {
      const expected = crypto
        .createHmac("sha256", settings.verifyEtWebhookSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");

      if (signature !== `sha256=${expected}`) {
        console.warn("[Verify.ET Webhook] Invalid signature match.");
        return new NextResponse("Unauthorized Signature", { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.info("[Verify.ET Webhook Received]:", payload.event, payload.requestId);

    // ── Process Successful Completion ──────────────────────────
    if (
      payload.event === "verification.completed" &&
      payload.data?.status === "success" &&
      payload.data?.verified === true
    ) {
      const referenceNumber = payload.data.referenceNumber;
      if (!referenceNumber) {
        return new NextResponse("Reference number missing in payload data", { status: 400 });
      }

      console.info(`[Verify.ET Webhook] Successful verification for reference: ${referenceNumber}. Searching matching pending payments...`);

      // Find pending payment with matching transactionId (case-insensitive)
      const payment = await prisma.payment.findFirst({
        where: {
          transactionId: {
            equals: referenceNumber,
            mode: "insensitive"
          },
          status: "PENDING"
        }
      });

      if (payment) {
        console.info(`[Verify.ET Webhook] Matching payment found (ID: ${payment.id}). Triggering automatic system approval...`);
        const result = await approvePaymentSystem(payment.id);
        if (result.success) {
          console.info(`[Verify.ET Webhook] Auto-approved payment ${payment.id} successfully.`);
        } else {
          console.error(`[Verify.ET Webhook] Auto-approval failed for payment ${payment.id}:`, result.error);
        }
      } else {
        console.warn(`[Verify.ET Webhook] No matching pending payment found in system for transaction ID: ${referenceNumber}`);
      }
    }

    return new NextResponse("Webhook processed", { status: 200 });
  } catch (error: any) {
    console.error("[Verify.ET Webhook Error]:", error);
    return new NextResponse(error?.message || "Internal server error", { status: 500 });
  }
}
