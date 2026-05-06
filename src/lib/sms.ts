import { prisma } from "@/lib/prisma";

export async function sendSMS(msisdn: string, text: string) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" }
    });

    if (!settings || !settings.smsEthiopiaKey) {
      console.warn("SMS Ethiopia API Key is not configured.");
      return { success: false, error: "SMS service not configured." };
    }

    const response = await fetch("https://smsethiopia.et/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "KEY": settings.smsEthiopiaKey
      },
      body: JSON.stringify({
        msisdn,
        text
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
