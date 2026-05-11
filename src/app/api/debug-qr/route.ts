import { NextResponse } from "next/server";
import { getPublicUnitStatus } from "@/lib/actions/qr";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const units = await prisma.unit.findMany({ where: { qrSlug: { not: null } } });
  const results = [];
  for (const u of units) {
    if (u.qrSlug) {
      const status = await getPublicUnitStatus(u.qrSlug);
      results.push({ slug: u.qrSlug, status });
    }
  }
  return NextResponse.json(results);
}
