import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const orders = await prisma.order.findMany({
    where: { businessId: BUSINESS_ID },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const { label } = await req.json();
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  const order = await prisma.order.create({
    data: { businessId: BUSINESS_ID, label, status: "draft" },
  });
  return NextResponse.json(order, { status: 201 });
}
