import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { businessId: BUSINESS_ID },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const { name, price } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const product = await prisma.product.create({
    data: { name: name.trim(), businessId: BUSINESS_ID, price: parseFloat(price) || 0 },
  });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, lowPortionsThreshold, price } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (lowPortionsThreshold !== undefined) {
    const parsed = parseFloat(lowPortionsThreshold);
    data.lowPortionsThreshold = isNaN(parsed) ? null : Math.floor(parsed);
  }
  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    data.price = isNaN(parsedPrice) ? 0 : parsedPrice;
  }
  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(product);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
