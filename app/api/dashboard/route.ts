import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

type Item = { quantity: number; product: { price: number | null; vatRate: number | null } };

function orderTotal(items: Item[]) {
  return items.reduce((sum, i) => sum + i.quantity * (i.product.price ?? 0), 0);
}

function vatBreakdown(items: Item[]) {
  const byRate = new Map<number, number>();
  for (const i of items) {
    const rate = i.product.vatRate ?? 10;
    const lineTotal = i.quantity * (i.product.price ?? 0);
    const iva = lineTotal - lineTotal / (1 + rate / 100);
    byRate.set(rate, (byRate.get(rate) ?? 0) + iva);
  }
  const totalIva = Array.from(byRate.values()).reduce((s, v) => s + v, 0);
  return {
    ivaByRate: Object.fromEntries(byRate),
    totalIva,
  };
}

export async function GET() {
  const orders = await prisma.order.findMany({
    where: { businessId: BUSINESS_ID },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const paidOrders = orders.filter((o) => o.status === "paid");
  const paidToday = paidOrders.filter(
    (o) => o.paidAt && new Date(o.paidAt) >= todayStart
  );

  const activeOrders = orders.filter(
    (o) => o.status === "draft" || o.status === "confirmed"
  );

  const todayRevenue = paidToday.reduce((sum, o) => sum + orderTotal(o.items), 0);
  const totalRevenue = paidOrders.reduce((sum, o) => sum + orderTotal(o.items), 0);

  // Aggregate today's IVA breakdown across all paid orders
  const allTodayItems = paidToday.flatMap((o) => o.items);
  const todayVat = vatBreakdown(allTodayItems);

  return NextResponse.json({
    todayRevenue,
    totalRevenue,
    todayOrderCount: paidToday.length,
    totalOrderCount: paidOrders.length,
    todayVat,
    activeOrders: activeOrders.map((o) => ({
      id: o.id,
      label: o.label,
      status: o.status,
      createdAt: o.createdAt,
      total: orderTotal(o.items),
      items: o.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
        vatRate: i.product.vatRate,
      })),
    })),
    paidOrders: paidToday.map((o) => ({
      id: o.id,
      label: o.label,
      paidAt: o.paidAt,
      total: orderTotal(o.items),
      vat: vatBreakdown(o.items),
      items: o.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
        vatRate: i.product.vatRate,
      })),
    })),
  });
}
