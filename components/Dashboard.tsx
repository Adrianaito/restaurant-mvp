"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OrderItem = { name: string; quantity: number; price: number; vatRate: number };
type VatBreakdown = { ivaByRate: Record<string, number>; totalIva: number };

type ActiveOrder = {
  id: string;
  label: string;
  status: string;
  createdAt: string;
  total: number;
  items: OrderItem[];
};

type PaidOrder = {
  id: string;
  label: string;
  paidAt: string;
  total: number;
  vat: VatBreakdown;
  items: OrderItem[];
};

type DashboardData = {
  todayRevenue: number;
  totalRevenue: number;
  todayOrderCount: number;
  totalOrderCount: number;
  todayVat: VatBreakdown;
  activeOrders: ActiveOrder[];
  paidOrders: PaidOrder[];
};

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-4 py-3 sm:py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="shrink-0 text-blue-600 font-semibold text-base sm:text-lg px-1 py-1"
          >
            ←
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Today's revenue</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{fmt(data.todayRevenue)} €</p>
            <p className="text-sm text-gray-400 mt-1">{data.todayOrderCount} order{data.todayOrderCount !== 1 ? "s" : ""} closed</p>
            {data.todayVat.totalIva > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                <p className="text-xs text-gray-400">Base: {fmt(data.todayRevenue - data.todayVat.totalIva)} €</p>
                {Object.entries(data.todayVat.ivaByRate).sort().map(([rate, iva]) => (
                  <p key={rate} className="text-xs text-gray-400">IVA {rate}%: {fmt(iva)} €</p>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">All-time revenue</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{fmt(data.totalRevenue)} €</p>
            <p className="text-sm text-gray-400 mt-1">{data.totalOrderCount} order{data.totalOrderCount !== 1 ? "s" : ""} total</p>
          </div>
        </div>

        {/* Active orders */}
        {data.activeOrders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Active tables ({data.activeOrders.length})
            </h2>
            <div className="space-y-2">
              {data.activeOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${order.status === "confirmed" ? "bg-green-500" : "bg-yellow-400"}`} />
                      <span className="font-semibold text-gray-800 truncate">{order.label}</span>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        order.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {order.status === "confirmed" ? "Confirmed" : "Draft"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-gray-900">{fmt(order.total)}</span>
                      <span className="text-gray-400">{expandedId === order.id ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {expandedId === order.id && (
                    <div className="border-t border-gray-100 px-4 pb-3 pt-2 space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm text-gray-600">
                          <span>{item.quantity}× {item.name}</span>
                          <span className="text-gray-500">{fmt(item.quantity * item.price)}</span>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-end">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-sm font-semibold text-blue-600 active:text-blue-800"
                        >
                          Open order →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paid today */}
        {data.paidOrders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Closed today ({data.paidOrders.length})
            </h2>
            <div className="space-y-2">
              {data.paidOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-semibold text-gray-800 truncate">{order.label}</span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {new Date(order.paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-gray-900">{fmt(order.total)}</span>
                      <span className="text-gray-400">{expandedId === order.id ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {expandedId === order.id && (
                    <div className="border-t border-gray-100 px-4 pb-3 pt-2 space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm text-gray-600">
                          <span>{item.quantity}× {item.name}</span>
                          <span className="text-gray-500">{fmt(item.quantity * item.price)} €</span>
                        </div>
                      ))}
                      {order.vat.totalIva > 0 && (
                        <div className="pt-2 border-t border-gray-100 space-y-0.5">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Base imponible</span>
                            <span>{fmt(order.total - order.vat.totalIva)} €</span>
                          </div>
                          {Object.entries(order.vat.ivaByRate).sort().map(([rate, iva]) => (
                            <div key={rate} className="flex justify-between text-xs text-gray-400">
                              <span>IVA {rate}%</span>
                              <span>{fmt(iva)} €</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.activeOrders.length === 0 && data.paidOrders.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-lg bg-white rounded-2xl border border-gray-100">
            No orders yet today.
          </div>
        )}
      </div>
    </div>
  );
}
