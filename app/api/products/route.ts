import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { businessId: BUSINESS_ID },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}
