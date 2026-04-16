import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    where: { businessId: BUSINESS_ID },
    orderBy: { name: "asc" },
  });
  return Response.json(ingredients);
}

export async function POST(request: NextRequest) {
  const { name, stock, unit } = await request.json();
  if (!name?.trim() || !unit?.trim()) {
    return Response.json({ error: "name and unit are required" }, { status: 400 });
  }
  const ingredient = await prisma.ingredient.create({
    data: {
      name: name.trim(),
      stock: parseFloat(stock) || 0,
      unit: unit.trim(),
      businessId: BUSINESS_ID,
    },
  });
  return Response.json(ingredient, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, stock } = await request.json();
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }
  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: { stock: parseFloat(stock) },
  });
  return Response.json(ingredient);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.ingredient.delete({ where: { id } });
  return Response.json({ ok: true });
}
