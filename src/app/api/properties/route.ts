import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const properties = await prisma.property.findMany({
    where: session.user.role === "MANAGER" ? { managerId: session.user.id } : {},
    include: { units: true },
  });

  return NextResponse.json(properties);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, address } = body;

    const property = await prisma.property.create({
      data: {
        name,
        address,
        managerId: session.user.id,
      },
    });

    // Create a log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `CREATED_PROPERTY: ${property.name}`,
        metadata: JSON.stringify({ propertyId: property.id }),
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
