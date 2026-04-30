import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_ID = "business-1";

function orderTotal(items: { quantity: number; product: { price: number | null } }[]) {
  return items.reduce((sum, item) => sum + item.quantity * (item.product.price ?? 0), 0);
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

  return NextResponse.json({
    todayRevenue,
    totalRevenue,
    todayOrderCount: paidToday.length,
    totalOrderCount: paidOrders.length,
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
      })),
    })),
    paidOrders: paidToday.map((o) => ({
      id: o.id,
      label: o.label,
      paidAt: o.paidAt,
      total: orderTotal(o.items),
      items: o.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
      })),
    })),
  });
}
