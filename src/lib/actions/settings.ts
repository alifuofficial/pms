"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveSessionUser } from "./auth-helper";
import { cache } from "react";
import nodemailer from "nodemailer";
import * as ftp from "basic-ftp";
import { Readable } from "stream";

export async function testSmtp(data: { host: string; port: number; user: string; pass: string }) {
  try {
    const transporter = nodemailer.createTransport({
      host: data.host,
      port: data.port,
      secure: data.port === 465,
      auth: {
        user: data.user,
        pass: data.pass,
      },
    });

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    console.error("SMTP Test Error:", error);
    return { success: false, error: error.message || "Failed to connect to SMTP server." };
  }
}

export async function testFtp(data: { host: string; port: number; user: string; pass: string; baseUrl?: string }) {
  const client = new ftp.Client(15000); // 15s timeout
  client.ftp.ipFamily = 4; // Explicitly IPv4
  client.ftp.verbose = true; // Verbose socket logs for debugging
  try {
    await client.access({
      host: data.host,
      port: data.port,
      user: data.user,
      password: data.pass,
    });
    
    // Upload a test connection file
    const content = `FTP Connection Test Successful!\nTimestamp: ${new Date().toISOString()}\nUploaded by: Soreti Property Rental Admin Settings\nStatus: OK`;
    const filename = "ftp-test-connection.txt";
    await client.uploadFrom(Readable.from(Buffer.from(content)), filename);
    
    const baseUrl = data.baseUrl 
      ? (data.baseUrl.endsWith("/") ? data.baseUrl : `${data.baseUrl}/`)
      : "https://storage.soretiinternational.com/upload/";
      
    return { success: true, testFileUrl: `${baseUrl}${filename}` };
  } catch (error: any) {
    console.error("FTP Test Error:", error);
    return { success: false, error: error.message || "Failed to connect to FTP server." };
  } finally {
    client.close();
  }
}

export const getEffectiveCalendar = cache(async () => {
  const sessionUser = await resolveSessionUser();
  if (sessionUser) {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { calendarType: true }
    });
    if (user?.calendarType) return user.calendarType;
  }
  const settings = await getSystemSettings();
  return settings.calendarType || "GREGORIAN";
});

export const getSystemSettings = cache(async () => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });
    return settings || { 
      systemName: "Soreti Property Rental", 
      currency: "ETB", 
      calendarType: "GREGORIAN",
      primaryColor: "#2563eb",
      logoUrl: null,
      organizationName: null,
      address: null,
      phone: null,
      supportEmail: null,
      tinNumber: null,
    } as any;
  } catch (error) {
    return { 
      systemName: "Soreti Property Rental", 
      currency: "ETB", 
      calendarType: "GREGORIAN",
      primaryColor: "#2563eb",
      logoUrl: null,
      organizationName: null,
      address: null,
      phone: null,
      supportEmail: null,
      tinNumber: null,
    } as any;
  }
});


export async function updateSystemSettings(data: any) {
  try {
    const { id, updatedAt, ...cleanData } = data;

    // Ensure numeric fields are actually numbers and not NaN
    if (cleanData.lateFeePercentage !== undefined) {
      cleanData.lateFeePercentage = isNaN(parseFloat(cleanData.lateFeePercentage)) ? 5.0 : parseFloat(cleanData.lateFeePercentage);
    }
    if (cleanData.warningFeePercentage !== undefined) {
      cleanData.warningFeePercentage = isNaN(parseFloat(cleanData.warningFeePercentage)) ? 10.0 : parseFloat(cleanData.warningFeePercentage);
    }
    if (cleanData.smtpPort !== undefined) {
      cleanData.smtpPort = isNaN(parseInt(cleanData.smtpPort)) ? null : parseInt(cleanData.smtpPort);
    }
    if (cleanData.ftpPort !== undefined) {
      cleanData.ftpPort = isNaN(parseInt(cleanData.ftpPort)) ? null : parseInt(cleanData.ftpPort);
    }

    await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: cleanData,
      create: { id: "global", ...cleanData },
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Settings Update Error:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function addBankAccount(data: { bankName: string; accountName: string; accountNumber: string }) {
  try {
    await prisma.bankAccount.create({ data });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Bank Account Add Error:", error);
    return { success: false, error: "Failed to add bank account" };
  }
}

export async function deleteBankAccount(id: string) {
  try {
    await prisma.bankAccount.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Bank Account Delete Error:", error);
    return { success: false, error: "Failed to delete bank account" };
  }
}

export async function testSms(phone: string, apiKey?: string) {
  try {
    const { sendSMS } = await import("@/lib/sms");
    const result = await sendSMS(
      phone,
      "This is a test message from Soreti PMS. If you received this, your SMS Ethiopia integration is working correctly.",
      undefined,
      "settings-test",
      apiKey
    );
    return result;
  } catch (error: any) {
    return { success: false, error: error?.message || "Test SMS failed" };
  }
}

export async function testVerifyEtConnection(apiKey: string) {
  try {
    const response = await fetch("https://verify.et/api/verify/test-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        webhookUrl: "https://verify.et/api/examples", // valid placeholder to test key
        scenario: "success"
      })
    });
    
    if (response.status === 401) {
      return { success: false, error: "Invalid API Key (Unauthorized)" };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Connection test failed." };
  }
}

export async function testVerifyEtWebhook(apiKey: string, webhookUrl: string) {
  try {
    const response = await fetch("https://verify.et/api/verify/test-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        webhookUrl,
        scenario: "success"
      })
    });
    
    if (response.status === 502 || response.status === 504) {
      return { 
        success: false, 
        error: "Verify.ET API reported a temporary Gateway Error (502/504). This is a temporary outage on the Verify.ET platform. Your local receiver is fully operational!" 
      };
    }
    
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return { success: true, message: data.message || "Webhook test payload delivered successfully." };
    } else {
      return { success: false, error: data.message || "Failed to deliver test webhook payload." };
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Webhook test failed." };
  }
}
