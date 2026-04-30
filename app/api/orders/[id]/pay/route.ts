import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "Order already paid" }, { status: 400 });
  if (order.status === "draft") return NextResponse.json({ error: "Order must be confirmed before payment" }, { status: 400 });
  if (order.items.length === 0) return NextResponse.json({ error: "Order has no items" }, { status: 400 });

  const paid = await prisma.order.update({
    where: { id },
    data: { status: "paid", paidAt: new Date() },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(paid);
}
