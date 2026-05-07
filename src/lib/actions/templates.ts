"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSmsTemplate(data: { name: string; description?: string; content: string; slug?: string; enabled?: boolean }) {
  try {
    const template = await prisma.smsTemplate.create({ data });
    revalidatePath("/admin/notify");
    return { success: true, data: template };
  } catch (error) {
    console.error("Create SMS Template Error:", error);
    return { success: false, error: "Failed to create template" };
  }
}

export async function updateSmsTemplate(id: string, data: { name?: string; description?: string; content?: string; enabled?: boolean }) {
  try {
    const template = await prisma.smsTemplate.update({
      where: { id },
      data,
    });
    revalidatePath("/admin/notify");
    return { success: true, data: template };
  } catch (error) {
    console.error("Update SMS Template Error:", error);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteSmsTemplate(id: string) {
  try {
    await prisma.smsTemplate.delete({ where: { id } });
    revalidatePath("/admin/notify");
    return { success: true };
  } catch (error) {
    console.error("Delete SMS Template Error:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

export async function getSmsTemplates() {
  try {
    return await prisma.smsTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Get SMS Templates Error:", error);
    return [];
  }
}
