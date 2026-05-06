import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ACCOUNTANT") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: params.id },
        data: {
          status: "APPROVED",
          approvedBy: session.user.id,
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
        userId: session.user.id,
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
