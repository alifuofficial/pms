import { prisma } from "@/lib/prisma";

export async function sendSMS(msisdn: string, textOrTemplate: string, variables?: Record<string, string>) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" }
    });

    if (!settings || !settings.smsEthiopiaKey) {
      console.warn("SMS Ethiopia API Key is not configured.");
      return { success: false, error: "SMS service not configured." };
    }

    let finalMessage = textOrTemplate;

    // If textOrTemplate looks like a slug (no spaces), try fetching template
    if (!textOrTemplate.includes(" ")) {
      const template = await prisma.smsTemplate.findUnique({
        where: { slug: textOrTemplate }
      });

      if (template) {
        if (!template.enabled) {
          console.info(`SMS Template ${textOrTemplate} is disabled. Skipping.`);
          return { success: true, skipped: true };
        }
        finalMessage = template.content;
        
        // Replace variables
        if (variables) {
          Object.entries(variables).forEach(([key, value]) => {
            finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, "g"), value);
          });
        }
      }
    }

    const response = await fetch("https://smsethiopia.et/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "KEY": settings.smsEthiopiaKey
      },
      body: JSON.stringify({
        msisdn,
        text: finalMessage
      })
    });

    const data = await response.json();

    if (response.ok && data.status === "success") {
      return { success: true, message: data.message };
    } else {
      console.error("SMS Ethiopia Error:", data);
      return { success: false, error: data.message || "Failed to send SMS." };
    }
  } catch (error) {
    console.error("SMS Delivery Error:", error);
    return { success: false, error: "Internal error occurred while sending SMS." };
  }
}
