import { prisma } from "@/lib/prisma";

export async function sendSMS(
  msisdn: string,
  textOrTemplate: string,
  variables?: Record<string, string>,
  source?: string
) {
  let finalMessage = textOrTemplate;
  let logStatus = "FAILED";
  let logResponse = "";

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

    if (!settings.smsEthiopiaKey) {
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
      headers: { "Content-Type": "application/json", "KEY": settings.smsEthiopiaKey },
      body: JSON.stringify({ msisdn, text: finalMessage })
    });

    const data = await response.json();
    console.log("[SMS_ETHIOPIA_RESPONSE]", data);
    logResponse = JSON.stringify(data);

    const isSuccessful =
      response.ok &&
      (data.status?.toLowerCase() === "success" ||
        data.status?.toLowerCase() === "accepted" ||
        data.code === 200 ||
        data.id);

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
