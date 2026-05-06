"use server";

import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { hash } from "bcryptjs";

export async function requestOtp(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { phoneNumber: true, id: true }
    });

    if (!user) {
      return { success: false, error: "No account found with this email." };
    }

    if (!user.phoneNumber) {
      return { success: false, error: "Your account does not have a registered phone number. Contact IT Support." };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otp.create({
      data: {
        identifier: email,
        code: otp,
        expiresAt,
      },
    });

    const smsResult = await sendSMS(user.phoneNumber, `Your Soreti PMS verification code is: ${otp}. Valid for 10 minutes.`);
    
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

export async function verifyOtpAndResetPassword(data: { email: string, code: string, password: string }) {
  try {
    const otpRecord = await prisma.otp.findFirst({
      where: {
        identifier: data.email,
        code: data.code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return { success: false, error: "Invalid or expired verification code." };
    }

    const passwordHash = await hash(data.password, 10);

    const user = await prisma.user.update({
      where: { email: data.email },
      data: { passwordHash },
      select: { phoneNumber: true }
    });

    if (user.phoneNumber) {
      await sendSMS(user.phoneNumber, "Your Soreti PMS password has been successfully reset. If you did not authorize this, please contact IT Support immediately.");
    }

    // Delete the OTP after use
    await prisma.otp.deleteMany({
      where: { identifier: data.email },
    });

    return { success: true };
  } catch (error) {
    console.error("Reset Password Error:", error);
    return { success: false, error: "Failed to reset password." };
  }
}
