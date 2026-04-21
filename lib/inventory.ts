import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

/**
 * Adjust inventory for a product by `quantity` units.
 * Positive quantity = deduct (consume). Negative = return (reverse).
 * Returns an error string if deduction would exceed available stock, null on success.
 */
export async function adjustInventory(
  productId: string,
  quantity: number
): Promise<string | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { recipeItems: { include: { ingredient: true } } },
  });
  if (!product) return `Product not found`;

  const latestProduction = await prisma.production.findFirst({
    where: { productId, businessId: BUSINESS_ID },
    orderBy: { createdAt: "desc" },
  });

  if (latestProduction) {
    if (quantity > 0) {
      const available = latestProduction.portionsMade - latestProduction.soldCount;
      if (available < quantity) {
        return `Not enough portions of "${product.name}": ${available} available, ${quantity} needed`;
      }
    }
    await prisma.production.update({
      where: { id: latestProduction.id },
      data: { soldCount: { increment: quantity } },
    });
  } else {
    if (quantity > 0) {
      for (const ri of product.recipeItems) {
        const required = ri.amount * quantity;
        if (ri.ingredient.stock < required) {
          return `Not enough ${ri.ingredient.name} for "${product.name}": need ${required} ${ri.ingredient.unit}, have ${ri.ingredient.stock}`;
        }
      }
    }
    for (const ri of product.recipeItems) {
      await prisma.ingredient.update({
        where: { id: ri.ingredientId },
        data: { stock: { decrement: ri.amount * quantity } },
      });
    }
  }

  return null;
}
