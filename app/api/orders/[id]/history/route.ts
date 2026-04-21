import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const logs = await prisma.orderEditLog.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(logs);
}
