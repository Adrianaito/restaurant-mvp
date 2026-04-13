import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { productId, quantity = 1 } = await req.json();

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Order already confirmed" }, { status: 400 });
  }

  // Check if item already exists and increment quantity
  const existing = await prisma.orderItem.findFirst({
    where: { orderId: id, productId },
  });

  let item;
  if (existing) {
    item = await prisma.orderItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
      include: { product: true },
    });
  } else {
    item = await prisma.orderItem.create({
      data: { orderId: id, productId, quantity },
      include: { product: true },
    });
  }

  return NextResponse.json(item, { status: 201 });
}
