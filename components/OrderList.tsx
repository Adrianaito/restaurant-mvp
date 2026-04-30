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

  // Active orders indexed by table label
  const activeByTable = new Map<string, Order>();
  for (const order of orders) {
    if (order.status !== "paid" && order.status !== "cancelled") {
      // Keep the most recent active order per table
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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tables</h1>
          <div className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg active:bg-gray-300"
              aria-label="Settings"
            >
              ⚙
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                  <Link
                    href="/tables"
                    className="block px-5 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => setShowSettings(false)}
                  >
                    Tables
                  </Link>
                  <Link
                    href="/inventory"
                    className="block px-5 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-100"
                    onClick={() => setShowSettings(false)}
                  >
                    Inventory
                  </Link>
                  <Link
                    href="/recipes"
                    className="block px-5 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-100"
                    onClick={() => setShowSettings(false)}
                  >
                    Recipes
                  </Link>
                  <Link
                    href="/production"
                    className="block px-5 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-100"
                    onClick={() => setShowSettings(false)}
                  >
                    Production
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table grid */}
        {tables.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-lg">
            No tables configured.{" "}
            <Link href="/tables" className="text-blue-600 underline">
              Add tables in Settings
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {tables.map((table) => {
              const active = activeByTable.get(table.name);
              const isOccupied = !!active;
              const isLoading = creating === table.name;

              return (
                <button
                  key={table.id}
                  onClick={() => openTable(table.name)}
                  disabled={isLoading}
                  className={`rounded-2xl p-4 text-left border-2 transition-colors active:scale-95 disabled:opacity-60 ${
                    isOccupied
                      ? active?.status === "confirmed"
                        ? "bg-green-50 border-green-300"
                        : "bg-yellow-50 border-yellow-300"
                      : "bg-white border-gray-200 active:bg-gray-50"
                  }`}
                >
                  <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
                    {isLoading ? "Opening…" : table.name}
                  </p>
                  {isOccupied && active ? (
                    <>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        active.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {active.status === "confirmed" ? "Confirmed" : "Draft"}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {active.items.length} item{active.items.length !== 1 ? "s" : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1">Free</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Closed today */}
        {paidToday.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Closed today
            </h2>
            <div className="space-y-2">
              {paidToday.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 active:bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-gray-700">{order.label}</p>
                    <p className="text-sm text-gray-400">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""} &middot; paid{" "}
                      {order.paidAt && new Date(order.paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
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
