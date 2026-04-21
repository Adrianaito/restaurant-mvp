import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustInventory } from "@/lib/inventory";

const BUSINESS_ID = "business-1";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: { recipeItems: { include: { ingredient: true } } },
          },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "draft") return NextResponse.json({ error: "Order is not a draft" }, { status: 400 });
  if (order.items.length === 0) return NextResponse.json({ error: "Order has no items" }, { status: 400 });

  // Pre-validate everything before making any changes
  for (const item of order.items) {
    const latestProduction = await prisma.production.findFirst({
      where: { productId: item.productId, businessId: BUSINESS_ID },
      orderBy: { createdAt: "desc" },
    });

    if (latestProduction) {
      const available = latestProduction.portionsMade - latestProduction.soldCount;
      if (available < item.quantity) {
        return NextResponse.json(
          { error: `Not enough portions of "${item.product.name}": ${available} available, ${item.quantity} needed` },
          { status: 422 }
        );
      }
    } else {
      for (const ri of item.product.recipeItems) {
        const required = ri.amount * item.quantity;
        if (ri.ingredient.stock < required) {
          return NextResponse.json(
            { error: `Not enough ${ri.ingredient.name} for "${item.product.name}": need ${required} ${ri.ingredient.unit}, have ${ri.ingredient.stock}` },
            { status: 422 }
          );
        }
      }
    }
  }

  // All checks passed — apply inventory changes
  for (const item of order.items) {
    await adjustInventory(item.productId, item.quantity);
  }

  const confirmed = await prisma.order.update({
    where: { id },
    data: { status: "confirmed" },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(confirmed);
}
