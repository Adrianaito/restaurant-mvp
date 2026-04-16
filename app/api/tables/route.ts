import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

export async function GET() {
  const tables = await prisma.table.findMany({
    where: { businessId: BUSINESS_ID },
    orderBy: { name: "asc" },
  });
  return Response.json(tables);
}

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  const table = await prisma.table.create({
    data: { name: name.trim(), businessId: BUSINESS_ID },
  });
  return Response.json(table, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.table.delete({ where: { id } });
  return Response.json({ ok: true });
}
