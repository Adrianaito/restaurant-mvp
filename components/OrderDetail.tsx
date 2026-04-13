"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductGrid from "./ProductGrid";

type OrderItem = {
  id: string;
  quantity: number;
  product: { id: string; name: string };
};

type Order = {
  id: string;
  label: string;
  status: "draft" | "confirmed";
  items: OrderItem[];
};

type Product = { id: string; name: string };

type Props = { orderId: string };

export default function OrderDetail({ orderId }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [confirming, setConfirming] = useState(false);

  async function fetchOrder() {
    const res = await fetch(`/api/orders`);
    const orders: Order[] = await res.json();
    const found = orders.find((o) => o.id === orderId);
    if (found) setOrder(found);
  }

  async function fetchProducts() {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }

  useEffect(() => {
    fetchOrder();
    fetchProducts();
  }, [orderId]);

  async function addItem(productId: string) {
    await fetch(`/api/orders/${orderId}/add-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    fetchOrder();
  }

  async function confirmOrder() {
    if (!order || order.items.length === 0) return;
    setConfirming(true);
    const res = await fetch(`/api/orders/${orderId}/confirm`, { method: "POST" });
    if (res.ok) {
      fetchOrder();
    }
    setConfirming(false);
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-xl">
        Loading...
      </div>
    );
  }

  const isDraft = order.status === "draft";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 font-semibold text-lg px-2 py-1"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.label}</h1>
            <span
              className={`text-sm font-semibold ${
                isDraft ? "text-yellow-600" : "text-green-600"
              }`}
            >
              {isDraft ? "Draft" : "Confirmed"}
            </span>
          </div>
        </div>

        {isDraft && (
          <button
            onClick={confirmOrder}
            disabled={confirming || order.items.length === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 active:bg-green-700"
          >
            {confirming ? "Confirming..." : "Confirm Order"}
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Order summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            Order Summary
          </h2>
          {order.items.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No items yet. Add products below.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <span className="text-lg font-medium text-gray-800">{item.product.name}</span>
                  <span className="text-xl font-bold text-gray-900 bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center">
                    {item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Product grid */}
        {isDraft && (
          <ProductGrid products={products} onAdd={addItem} />
        )}

        {!isDraft && (
          <div className="text-center py-6 text-green-600 font-semibold text-lg bg-green-50 rounded-2xl">
            Order confirmed. Inventory updated.
          </div>
        )}
      </div>
    </div>
  );
}
