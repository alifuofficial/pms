import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const roles = ["ADMIN", "ACCOUNTANT", "MANAGER", "TENANT"] as const;
    const password = await hash("Soreti123!", 10);

    const results = [];

    // 1. Seed Users
    for (const role of roles) {
      const email = `${role.toLowerCase()}@soreti.com`;
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          passwordHash: password,
        },
        create: {
          email,
          name: `Soreti ${role.charAt(0) + role.slice(1).toLowerCase()} Demo`,
          passwordHash: password,
          role: role,
        },
      });
      results.push(`Created/Updated user: ${user.email} (${user.role})`);
    }

    // 2. Seed System Settings
    await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: {
        systemName: "Soreti Property Rental",
        organizationName: "Soreti International Trading",
        currency: "ETB",
        calendarType: "GREGORIAN",
      },
      create: {
        id: "global",
        systemName: "Soreti Property Rental",
        organizationName: "Soreti International Trading",
        currency: "ETB",
        calendarType: "GREGORIAN",
        primaryColor: "#2563eb",
      },
    });
    results.push("System settings seeded/updated.");

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully.",
      results
    });
  } catch (error: any) {
    console.error("Manual Seed Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to seed database."
    }, { status: 500 });
  }
}
