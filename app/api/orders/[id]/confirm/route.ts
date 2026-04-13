import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Order already confirmed" }, { status: 400 });
  }
  if (order.items.length === 0) {
    return NextResponse.json({ error: "Order has no items" }, { status: 400 });
  }

  // Deduct ingredients
  for (const item of order.items) {
    for (const recipeItem of item.product.recipeItems) {
      const deduction = recipeItem.amount * item.quantity;
      await prisma.ingredient.update({
        where: { id: recipeItem.ingredientId },
        data: { stock: { decrement: deduction } },
      });
    }
  }

  const confirmed = await prisma.order.update({
    where: { id },
    data: { status: "confirmed" },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(confirmed);
}
