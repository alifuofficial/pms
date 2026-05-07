"use server";

import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { hash } from "bcryptjs";

export async function requestOtp(identifier: string) {
  try {
    // Try email first
    let user = await prisma.user.findUnique({
      where: { email: identifier },
      select: { phoneNumber: true, id: true, email: true }
    });

    // If not found by email, try by phone number
    if (!user) {
      user = await prisma.user.findFirst({
        where: { phoneNumber: identifier },
        select: { phoneNumber: true, id: true, email: true }
      });
    }

    if (!user) {
      return { success: false, error: "No account found with this email or phone number." };
    }

    const targetPhone = user.phoneNumber;
    if (!targetPhone) {
      return { success: false, error: "Your account does not have a registered phone number. Contact IT Support." };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otp.create({
      data: {
        identifier: identifier,
        code: otp,
        expiresAt,
      },
    });

    const smsResult = await sendSMS(targetPhone, "otp-code", { code: otp });
    
    if (smsResult.success) {
      return { success: true };
    } else {
      return { success: false, error: smsResult.error };
    }
  } catch (error) {
    console.error("OTP Request Error:", error);
    return { success: false, error: "Failed to send OTP." };
  }
}

export async function verifyOtpAndResetPassword(data: { identifier: string, code: string, password: string }) {
  try {
    const otpRecord = await prisma.otp.findFirst({
      where: {
        identifier: data.identifier,
        code: data.code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return { success: false, error: "Invalid or expired verification code." };
    }

    // Find user by identifier (email or phone) to get the correct account
    let user = await prisma.user.findUnique({
      where: { email: data.identifier },
      select: { id: true, phoneNumber: true }
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { phoneNumber: data.identifier },
        select: { id: true, phoneNumber: true }
      });
    }

    if (!user) {
      return { success: false, error: "User not found." };
    }

    const passwordHash = await hash(data.password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    if (user.phoneNumber) {
      await sendSMS(user.phoneNumber, "password-reset-success");
    }

    // Delete the OTP after use
    await prisma.otp.deleteMany({
      where: { identifier: data.identifier },
    });

    return { success: true };
  } catch (error) {
    console.error("Reset Password Error:", error);
    return { success: false, error: "Failed to reset password." };
  }
}
