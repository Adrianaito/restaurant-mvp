"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  id: string;
  quantity: number;
  product: { name: string };
};

type Order = {
  id: string;
  label: string;
  status: "draft" | "confirmed";
  createdAt: string;
  items: OrderItem[];
};

type Table = { id: string; name: string };

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function fetchOrders() {
    const res = await fetch("/api/orders");
    setOrders(await res.json());
  }

  async function fetchTables() {
    const res = await fetch("/api/tables");
    setTables(await res.json());
  }

  useEffect(() => {
    fetchOrders();
    fetchTables();
  }, []);

  function openForm() {
    setSelectedTable(null);
    setShowForm(true);
  }

  async function createOrder() {
    if (!selectedTable) return;
    setCreating(true);
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: selectedTable }),
    });
    setSelectedTable(null);
    setShowForm(false);
    setCreating(false);
    fetchOrders();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
          <div className="flex gap-2 items-center">
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
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSettings(false)}
                  />
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
                  </div>
                </>
              )}
            </div>
            <button
              onClick={openForm}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-xl font-semibold text-base sm:text-lg active:bg-blue-700"
            >
              + New Order
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow mb-4 sm:mb-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Select a table</h2>
            {tables.length === 0 ? (
              <p className="text-gray-400 mb-4">
                No tables configured.{" "}
                <Link href="/tables" className="text-blue-600 underline">
                  Add tables in Settings
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.name)}
                    className={`py-4 rounded-xl font-semibold text-base sm:text-lg border-2 transition-colors ${
                      selectedTable === t.name
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 active:bg-gray-50"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={createOrder}
                disabled={creating || !selectedTable}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-base sm:text-lg disabled:opacity-50 active:bg-blue-700"
              >
                {creating ? "Creating…" : "Create Order"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 sm:px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-base sm:text-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-lg sm:text-xl">
              No orders yet. Tap &quot;+ New Order&quot; to start.
            </div>
          )}
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 active:bg-gray-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{order.label}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""} &middot;{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-semibold ${
                    order.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.status === "confirmed" ? "Confirmed" : "Draft"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
