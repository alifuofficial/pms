import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BulkPrintClient } from "./bulk-print-client";

export default async function PrintAllPage({
  searchParams
}: {
  searchParams: Promise<{ propertyId?: string }>
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Resolve search parameters safely
  const params = await searchParams;
  const propertyId = params?.propertyId;

  // Build prisma query
  const where: any = {
    AND: [
      { qrSlug: { not: null } },
      { qrSlug: { not: "" } }
    ]
  };
  if (propertyId) {
    where.propertyId = propertyId;
  }

  // Fetch all qualified units
  const units = await prisma.unit.findMany({
    where,
    include: {
      property: { select: { name: true } }
    },
    orderBy: [
      { property: { name: "asc" } },
      { unitNumber: "asc" }
    ]
  });

  return (
    <BulkPrintClient units={units} />
  );
}
