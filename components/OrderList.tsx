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

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function fetchOrders() {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
  }

  useEffect(() => { fetchOrders(); }, []);

  async function createOrder() {
    if (!label.trim()) return;
    setCreating(true);
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    });
    setLabel("");
    setShowForm(false);
    setCreating(false);
    fetchOrders();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <div className="flex gap-2">
            <Link
              href="/inventory"
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg"
            >
              Inventory
            </Link>
            <Link
              href="/recipes"
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg"
            >
              Recipes
            </Link>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg active:bg-blue-700"
            >
              + New Order
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow mb-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">New Order</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. Table 1, Takeaway..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createOrder()}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <button
                onClick={createOrder}
                disabled={creating || !label.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 active:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-xl">
              No orders yet. Tap &quot;+ New Order&quot; to start.
            </div>
          )}
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-gray-900">{order.label}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""} &middot;{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
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
