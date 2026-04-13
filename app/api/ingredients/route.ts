import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    where: { businessId: BUSINESS_ID },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(ingredients);
}
