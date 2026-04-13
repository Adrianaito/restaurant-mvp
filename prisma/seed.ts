import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl = `file:${path.resolve(process.cwd(), "dev.db")}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Create business
  const business = await prisma.business.upsert({
    where: { id: "business-1" },
    update: {},
    create: { id: "business-1", name: "My Restaurant" },
  });

  // Create ingredients
  const cheese = await prisma.ingredient.upsert({
    where: { id: "ing-cheese" },
    update: {},
    create: { id: "ing-cheese", name: "Cheese", stock: 5, unit: "kg", businessId: business.id },
  });

  const meat = await prisma.ingredient.upsert({
    where: { id: "ing-meat" },
    update: {},
    create: { id: "ing-meat", name: "Meat", stock: 3, unit: "kg", businessId: business.id },
  });

  const milk = await prisma.ingredient.upsert({
    where: { id: "ing-milk" },
    update: {},
    create: { id: "ing-milk", name: "Milk", stock: 10, unit: "L", businessId: business.id },
  });

  // Create products
  const lasagna = await prisma.product.upsert({
    where: { id: "prod-lasagna" },
    update: {},
    create: { id: "prod-lasagna", name: "Lasagna", businessId: business.id },
  });

  const coffee = await prisma.product.upsert({
    where: { id: "prod-coffee" },
    update: {},
    create: { id: "prod-coffee", name: "Coffee", businessId: business.id },
  });

  const cake = await prisma.product.upsert({
    where: { id: "prod-cake" },
    update: {},
    create: { id: "prod-cake", name: "Cake", businessId: business.id },
  });

  // Create recipe items
  await prisma.recipeItem.upsert({
    where: { id: "recipe-lasagna-cheese" },
    update: {},
    create: { id: "recipe-lasagna-cheese", productId: lasagna.id, ingredientId: cheese.id, amount: 0.2 },
  });

  await prisma.recipeItem.upsert({
    where: { id: "recipe-lasagna-meat" },
    update: {},
    create: { id: "recipe-lasagna-meat", productId: lasagna.id, ingredientId: meat.id, amount: 0.1 },
  });

  await prisma.recipeItem.upsert({
    where: { id: "recipe-coffee-milk" },
    update: {},
    create: { id: "recipe-coffee-milk", productId: coffee.id, ingredientId: milk.id, amount: 0.1 },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
