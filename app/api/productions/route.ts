import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const productions = await prisma.production.findMany({
    where: { businessId: BUSINESS_ID },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(productions);
}

export async function POST(request: NextRequest) {
  const { productId, portions } = await request.json();
  if (!productId || !portions || portions < 1) {
    return Response.json({ error: "productId and portions are required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { recipeItems: { include: { ingredient: true } } },
  });

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.recipeItems.length === 0) {
    return Response.json({ error: "Product has no recipe" }, { status: 422 });
  }

  // Check every ingredient has enough stock
  const shortfalls: string[] = [];
  for (const ri of product.recipeItems) {
    const required = ri.amount * portions;
    if (ri.ingredient.stock < required) {
      shortfalls.push(
        `${ri.ingredient.name}: need ${required} ${ri.ingredient.unit}, have ${ri.ingredient.stock}`
      );
    }
  }
  if (shortfalls.length > 0) {
    return Response.json({ error: "Insufficient stock", shortfalls }, { status: 422 });
  }

  // Atomically deduct ingredients and create production record
  await prisma.$transaction([
    ...product.recipeItems.map((ri) =>
      prisma.ingredient.update({
        where: { id: ri.ingredientId },
        data: { stock: { decrement: ri.amount * portions } },
      })
    ),
    prisma.production.create({
      data: { productId, portionsMade: portions, businessId: BUSINESS_ID },
    }),
  ]);

  const production = await prisma.production.findFirst({
    where: { productId, businessId: BUSINESS_ID },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(production, { status: 201 });
}
