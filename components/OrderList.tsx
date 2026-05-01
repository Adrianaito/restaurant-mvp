"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OrderItem = {
  id: string;
  quantity: number;
  product: { name: string };
};

type Order = {
  id: string;
  label: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  items: OrderItem[];
};

type Table = { id: string; name: string };

export default function OrderList() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  async function fetchData() {
    const [ordersRes, tablesRes] = await Promise.all([
      fetch("/api/orders"),
      fetch("/api/tables"),
    ]);
    setOrders(await ordersRes.json());
    setTables(await tablesRes.json());
  }

  useEffect(() => {
    fetchData();
  }, []);

  const activeByTable = new Map<string, Order>();
  for (const order of orders) {
    if (order.status !== "paid" && order.status !== "cancelled") {
      const existing = activeByTable.get(order.label);
      if (!existing || order.createdAt > existing.createdAt) {
        activeByTable.set(order.label, order);
      }
    }
  }

  async function openTable(tableName: string) {
    const active = activeByTable.get(tableName);
    if (active) {
      router.push(`/orders/${active.id}`);
      return;
    }
    setCreating(tableName);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: tableName }),
    });
    const order = await res.json();
    setCreating(null);
    router.push(`/orders/${order.id}`);
  }

  const today = new Date().toDateString();
  const paidToday = orders.filter(
    (o) => o.status === "paid" && o.paidAt && new Date(o.paidAt).toDateString() === today
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Tables</h1>
          <div className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden py-1">
                  {[
                    { href: "/dashboard", label: "Dashboard" },
                    { href: "/tables", label: "Tables" },
                    { href: "/inventory", label: "Inventory" },
                    { href: "/recipes", label: "Recipes" },
                    { href: "/production", label: "Production" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                      onClick={() => setShowSettings(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Table grid */}
        {tables.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-base font-medium mb-1">No tables configured</p>
            <Link href="/tables" className="text-indigo-600 text-sm font-medium">
              Add tables in Settings →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tables.map((table) => {
              const active = activeByTable.get(table.name);
              const isOccupied = !!active;
              const isLoading = creating === table.name;
              const isConfirmed = active?.status === "confirmed";

              return (
                <button
                  key={table.id}
                  onClick={() => openTable(table.name)}
                  disabled={isLoading}
                  className={`rounded-xl p-4 text-left border transition-colors active:scale-95 disabled:opacity-60 ${
                    isOccupied
                      ? isConfirmed
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 truncate mb-1.5">
                    {isLoading ? "Opening…" : table.name}
                  </p>
                  {isOccupied && active ? (
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isConfirmed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {isConfirmed ? "Confirmed" : "Draft"}
                      </span>
                      <p className="text-xs text-slate-400">
                        {active.items.length} item{active.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Available</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Closed today */}
        {paidToday.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Closed today
            </p>
            <div className="space-y-1.5">
              {paidToday.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-200 hover:border-slate-300 active:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">{order.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""} · paid{" "}
                      {order.paidAt && new Date(order.paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    Paid
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
