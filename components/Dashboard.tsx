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
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="shrink-0 p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(data.todayRevenue)} €</p>
            <p className="text-xs text-slate-400 mt-1">{data.todayOrderCount} order{data.todayOrderCount !== 1 ? "s" : ""} closed</p>
            {data.todayVat.totalIva > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-0.5">
                <p className="text-xs text-slate-400">Base: {fmt(data.todayRevenue - data.todayVat.totalIva)} €</p>
                {Object.entries(data.todayVat.ivaByRate).sort().map(([rate, iva]) => (
                  <p key={rate} className="text-xs text-slate-400">IVA {rate}%: {fmt(iva)} €</p>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">All time</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(data.totalRevenue)} €</p>
            <p className="text-xs text-slate-400 mt-1">{data.totalOrderCount} order{data.totalOrderCount !== 1 ? "s" : ""} total</p>
          </div>
        </div>

        {/* Active orders */}
        {data.activeOrders.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Active tables ({data.activeOrders.length})
            </p>
            <div className="space-y-2">
              {data.activeOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${order.status === "confirmed" ? "bg-emerald-500" : "bg-amber-400"}`} />
                      <span className="font-medium text-slate-800 text-sm truncate">{order.label}</span>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        order.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {order.status === "confirmed" ? "Confirmed" : "Draft"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-semibold text-slate-900">{fmt(order.total)} €</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === order.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedId === order.id && (
                    <div className="border-t border-slate-100 px-4 pb-3 pt-2.5 space-y-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm text-slate-600">
                          <span>{item.quantity}× {item.name}</span>
                          <span className="text-slate-500">{fmt(item.quantity * item.price)} €</span>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-end">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-xs font-semibold text-indigo-600 active:text-indigo-800"
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Closed today ({data.paidOrders.length})
            </p>
            <div className="space-y-2">
              {data.paidOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-medium text-slate-800 truncate">{order.label}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {new Date(order.paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-semibold text-slate-900">{fmt(order.total)} €</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === order.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedId === order.id && (
                    <div className="border-t border-slate-100 px-4 pb-3 pt-2.5 space-y-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm text-slate-600">
                          <span>{item.quantity}× {item.name}</span>
                          <span className="text-slate-500">{fmt(item.quantity * item.price)} €</span>
                        </div>
                      ))}
                      {order.vat.totalIva > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Base imponible</span>
                            <span>{fmt(order.total - order.vat.totalIva)} €</span>
                          </div>
                          {Object.entries(order.vat.ivaByRate).sort().map(([rate, iva]) => (
                            <div key={rate} className="flex justify-between text-xs text-slate-400">
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
          <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            No orders yet today.
          </div>
        )}
      </div>
    </div>
  );
}
