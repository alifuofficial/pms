import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BulkPrintClient } from "./bulk-print-client";

export default async function PrintAllPage({
  searchParams
}: {
  searchParams: Promise<{
    propertyId?: string;
    status?: string;
    type?: string;
    qrPrinted?: string;
    floor?: string;
    q?: string;
  }>
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Resolve search parameters safely
  const params = await searchParams;

  // Build prisma query
  const where: any = {
    AND: [
      { qrSlug: { not: null } },
      { qrSlug: { not: "" } }
    ]
  };

  if (params?.propertyId) where.propertyId = params.propertyId;
  if (params?.status)     where.status     = params.status;
  if (params?.type)       where.type       = params.type;
  if (params?.qrPrinted)  where.qrPrinted  = params.qrPrinted === "true";
  
  if (params?.q) {
    where.OR = [
      { unitNumber: { contains: params.q } },
      { property:   { name:    { contains: params.q } } }
    ];
  }
  
  const currentFloor = params?.floor !== undefined && params.floor !== ""
    ? parseInt(params.floor as string)
    : undefined;
  if (currentFloor !== undefined) where.floor = currentFloor;

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
