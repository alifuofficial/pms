import { resolveSessionUser } from "@/lib/actions/auth-helper";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || sessionUser.role !== "ACCOUNTANT") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedBy: sessionUser.id,
          paidAt: new Date(),
        },
        include: { lease: true }
      });

      // If this payment is linked to a PENDING lease, activate it
      if (p.lease && p.lease.status === "PENDING") {
        await tx.lease.update({
          where: { id: p.leaseId },
          data: { status: "ACTIVE" }
        });
      }

      return p;
    });

    // Create a log
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `APPROVED_PAYMENT: ${payment.id}`,
        metadata: JSON.stringify({ 
          amount: payment.amount, 
          tenantId: payment.tenantId,
          leaseActivated: payment.lease?.status === "PENDING"
        }),
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
