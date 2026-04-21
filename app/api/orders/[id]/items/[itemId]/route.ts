import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustInventory } from "@/lib/inventory";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const { quantity } = await req.json();

  if (typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "quantity must be a positive number" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "Order is closed" }, { status: 400 });

  const existing = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });
  if (!existing || existing.orderId !== id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Always adjust inventory by the delta
  const delta = quantity - existing.quantity;
  if (delta !== 0) {
    const err = await adjustInventory(existing.productId, delta);
    if (err) return NextResponse.json({ error: err }, { status: 422 });
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { product: true },
  });

  await prisma.orderEditLog.create({
    data: {
      orderId: id,
      action: "update_quantity",
      productId: existing.productId,
      productName: existing.product.name,
      quantityBefore: existing.quantity,
      quantityAfter: quantity,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "Order is closed" }, { status: 400 });

  const existing = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });
  if (!existing || existing.orderId !== id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Always return inventory when removing an item
  await adjustInventory(existing.productId, -existing.quantity);

  await prisma.orderItem.delete({ where: { id: itemId } });

  await prisma.orderEditLog.create({
    data: {
      orderId: id,
      action: "remove",
      productId: existing.productId,
      productName: existing.product.name,
      quantityBefore: existing.quantity,
      quantityAfter: null,
    },
  });

  return NextResponse.json({ ok: true });
}
