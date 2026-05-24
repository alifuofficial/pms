import { prisma } from "@/lib/prisma";

/** Normalize Ethiopian phone numbers: 09xx/07xx → 2519xx/2517xx, 9xx/7xx (9-digit) → 2519xx/2517xx */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("09") || digits.startsWith("07")) {
    return "251" + digits.slice(1);
  }
  if ((digits.startsWith("9") || digits.startsWith("7")) && digits.length === 9) {
    return "251" + digits;
  }
  return digits;
}

export async function sendSMS(
  msisdn: string,
  textOrTemplate: string,
  variables?: Record<string, string>,
  source?: string,
  apiKey?: string
) {
  let finalMessage = textOrTemplate;
  let logStatus = "FAILED";
  let logResponse = "";
  msisdn = normalizePhone(msisdn); // auto-convert 09xx/07xx → 2519xx/2517xx

  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });

    // ── Global SMS kill-switch ────────────────────────────────
    if (!settings?.smsEnabled) {
      await prisma.smsLog.create({
        data: { msisdn, message: textOrTemplate, status: "DISABLED", source: source || "system", response: "SMS globally disabled" }
      });
      console.info("[SMS] Global SMS is disabled. Skipping send.");
      return { success: true, skipped: true };
    }

    const activeKey = apiKey || settings?.smsEthiopiaKey;

    if (!activeKey) {
      console.warn("[SMS] API Key is not configured.");
      await prisma.smsLog.create({
        data: { msisdn, message: textOrTemplate, status: "FAILED", source: source || "system", response: "API key not configured" }
      });
      return { success: false, error: "SMS service not configured." };
    }

    // ── Resolve template slug → message ──────────────────────
    if (!textOrTemplate.includes(" ")) {
      const template = await prisma.smsTemplate.findUnique({ where: { slug: textOrTemplate } });

      if (template) {
        if (!template.enabled) {
          await prisma.smsLog.create({
            data: { msisdn, message: textOrTemplate, status: "SKIPPED", source: source || "system", response: "Template disabled" }
          });
          console.info(`[SMS] Template "${textOrTemplate}" is disabled. Skipping.`);
          return { success: true, skipped: true };
        }
        finalMessage = template.content;
        if (variables) {
          Object.entries(variables).forEach(([key, value]) => {
            finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, "g"), value);
          });
        }
      } else if (textOrTemplate === "otp-code" && variables?.code) {
        finalMessage = `Your Soreti PMS verification code is: ${variables.code}. Valid for 10 minutes.`;
      } else {
        console.error(`[SMS] Template not found: ${textOrTemplate}`);
        await prisma.smsLog.create({
          data: { msisdn, message: textOrTemplate, status: "FAILED", source: source || "system", response: "Template not found" }
        });
        return { success: false, error: "System configuration error: SMS template missing." };
      }
    }

    // ── Send via SMS Ethiopia API ─────────────────────────────
    const response = await fetch("https://smsethiopia.et/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "KEY": activeKey },
      body: JSON.stringify({ msisdn, text: finalMessage })
    });

    const data = await response.json().catch(() => ({}));
    console.log("[SMS_ETHIOPIA_RESPONSE]", data);
    logResponse = JSON.stringify(data);

    // Treat HTTP 2xx as success. Additionally check common body shapes
    // (SMS Ethiopia may return 200 with varying body structures).
    const isSuccessful =
      response.ok ||
      data?.success === true ||
      data?.sent === true ||
      data?.status?.toLowerCase() === "success" ||
      data?.status?.toLowerCase() === "accepted" ||
      data?.status?.toLowerCase() === "sent" ||
      data?.code === 200 ||
      data?.id !== undefined;

    logStatus = isSuccessful ? "SUCCESS" : "FAILED";

    await prisma.smsLog.create({
      data: { msisdn, message: finalMessage, status: logStatus, source: source || "system", response: logResponse }
    });

    if (isSuccessful) {
      return { success: true, message: data.message };
    } else {
      console.error("[SMS] Ethiopia Error:", data);
      return { success: false, error: data.message || "Failed to send SMS." };
    }
  } catch (error: any) {
    console.error("[SMS] Delivery Error:", error);
    try {
      await prisma.smsLog.create({
        data: { msisdn, message: finalMessage, status: "FAILED", source: source || "system", response: error?.message || "Internal error" }
      });
    } catch {}
    return { success: false, error: "Internal error occurred while sending SMS." };
  }
}
