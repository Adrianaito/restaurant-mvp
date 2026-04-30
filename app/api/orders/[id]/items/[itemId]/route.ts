import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustInventory } from "@/lib/inventory";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const { quantity, reason } = await req.json();

  if (typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "quantity must be a positive number" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "Order is closed" }, { status: 400 });

  const existing = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });
  if (!existing || existing.orderId !== id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (order.status === "confirmed") {
    if (reason) {
      // Popup-driven partial decrement: adjust inventory by delta, keep order confirmed.
      // reason "return" restores stock for the removed units; defect/comp leave inventory as-is.
      const delta = quantity - existing.quantity; // negative (reducing)
      if (reason === "return" && delta < 0) {
        await adjustInventory(existing.productId, delta); // negative = return to inventory
      }
    } else {
      // Free-form edit (+ button): return all inventory and revert to draft so waiter re-confirms.
      for (const item of order.items) {
        await adjustInventory(item.productId, -item.quantity);
      }
      await prisma.order.update({ where: { id }, data: { status: "draft" } });
    }
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { product: true },
  });

  const action = reason && order.status === "confirmed"
    ? `remove_${reason}`
    : "update_quantity";

  await prisma.orderEditLog.create({
    data: {
      orderId: id,
      action,
      productId: existing.productId,
      productName: existing.product.name,
      quantityBefore: existing.quantity,
      quantityAfter: quantity,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const { searchParams } = new URL(req.url);
  // reason: "return" | "defect" | "comp" — only relevant for confirmed orders
  const reason = searchParams.get("reason") ?? "return";

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

  // Only return inventory if confirmed AND reason is "return"
  if (order.status === "confirmed" && reason === "return") {
    await adjustInventory(existing.productId, -existing.quantity);
  }

  await prisma.orderItem.delete({ where: { id: itemId } });

  const action =
    order.status === "draft" ? "remove" : `remove_${reason}`;

  await prisma.orderEditLog.create({
    data: {
      orderId: id,
      action,
      productId: existing.productId,
      productName: existing.product.name,
      quantityBefore: existing.quantity,
      quantityAfter: null,
    },
  });

  return NextResponse.json({ ok: true });
}
