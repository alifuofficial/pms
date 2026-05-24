import { resolveSessionUser } from "@/lib/actions/auth-helper";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "MANAGER" && sessionUser.role !== "ADMIN")) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const properties = await prisma.property.findMany({
    where: sessionUser.role === "MANAGER" ? { managerId: sessionUser.id } : {},
    include: { units: true },
  });

  return NextResponse.json(properties);
}

export async function POST(req: Request) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || sessionUser.role !== "MANAGER") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, address } = body;

    const property = await prisma.property.create({
      data: {
        name,
        address,
        managerId: sessionUser.id,
      },
    });

    // Create a log
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `CREATED_PROPERTY: ${property.name}`,
        metadata: JSON.stringify({ propertyId: property.id }),
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
