import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustInventory } from "@/lib/inventory";

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
  if (order.status === "cancelled") return NextResponse.json({ error: "Order already cancelled" }, { status: 400 });

  // Always return inventory for all items when cancelling
  for (const item of order.items) {
    await adjustInventory(item.productId, -item.quantity);
  }

  const cancelled = await prisma.order.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json(cancelled);
}
