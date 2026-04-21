import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { businessId: BUSINESS_ID },
    orderBy: { name: "asc" },
    include: {
      recipeItems: {
        include: { ingredient: true },
      },
    },
  });
  return Response.json(products);
}

// PUT /api/recipes
// Body: { productId: string, items: { ingredientId: string, amount: number }[] }
// Replaces all recipe items for the given product.
export async function PUT(request: NextRequest) {
  const { productId, items, portionsPerUnit } = await request.json();

  if (!productId || !Array.isArray(items)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { portionsPerUnit: Math.max(1, parseInt(portionsPerUnit) || 1) },
    }),
    prisma.recipeItem.deleteMany({ where: { productId } }),
    prisma.recipeItem.createMany({
      data: items.map((item: { ingredientId: string; amount: number }) => ({
        productId,
        ingredientId: item.ingredientId,
        amount: item.amount,
      })),
    }),
  ]);

  return Response.json({ ok: true });
}
