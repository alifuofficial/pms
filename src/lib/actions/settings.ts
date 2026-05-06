"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cache } from "react";
import nodemailer from "nodemailer";
import * as ftp from "basic-ftp";

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

export async function testFtp(data: { host: string; port: number; user: string; pass: string }) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: data.host,
      port: data.port,
      user: data.user,
      password: data.pass,
    });
    await client.list(); // Test listing files
    return { success: true };
  } catch (error: any) {
    console.error("FTP Test Error:", error);
    return { success: false, error: error.message || "Failed to connect to FTP server." };
  } finally {
    client.close();
  }
}

export const getEffectiveCalendar = cache(async () => {
  const session = await auth();
  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
      systemName: "NexusPMS", 
      currency: "ETB", 
      calendarType: "GREGORIAN",
      primaryColor: "#2563eb"
    };
  } catch (error) {
    return { 
      systemName: "NexusPMS", 
      currency: "ETB", 
      calendarType: "GREGORIAN",
      primaryColor: "#2563eb"
    };
  }
});


export async function updateSystemSettings(data: any) {
  try {
    await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: data,
      create: { id: "global", ...data },
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
