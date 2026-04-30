import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustInventory } from "@/lib/inventory";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { productId, quantity = 1 } = await req.json();

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "Order is closed" }, { status: 400 });

  // Adding to a confirmed order returns all inventory and reverts to draft,
  // so the waiter must confirm again (deducting everything fresh).
  if (order.status === "confirmed") {
    for (const item of order.items) {
      await adjustInventory(item.productId, -item.quantity);
    }
    await prisma.order.update({ where: { id }, data: { status: "draft" } });
  }

  const existing = await prisma.orderItem.findFirst({
    where: { orderId: id, productId },
    include: { product: true },
  });

  let item;
  if (existing) {
    item = await prisma.orderItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
      include: { product: true },
    });
    await prisma.orderEditLog.create({
      data: {
        orderId: id,
        action: "update_quantity",
        productId,
        productName: existing.product.name,
        quantityBefore: existing.quantity,
        quantityAfter: existing.quantity + quantity,
      },
    });
  } else {
    item = await prisma.orderItem.create({
      data: { orderId: id, productId, quantity },
      include: { product: true },
    });
    await prisma.orderEditLog.create({
      data: {
        orderId: id,
        action: "add",
        productId,
        productName: item.product.name,
        quantityBefore: null,
        quantityAfter: quantity,
      },
    });
  }

  return NextResponse.json(item, { status: 201 });
}
