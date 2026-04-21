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
  status: string;
  items: OrderItem[];
};

type Product = { id: string; name: string };

type EditLog = {
  id: string;
  action: string;
  productName: string;
  quantityBefore: number | null;
  quantityAfter: number | null;
  createdAt: string;
};

type Props = { orderId: string };

function formatAction(log: EditLog): string {
  if (log.action === "add") return `Added ${log.productName} ×${log.quantityAfter}`;
  if (log.action === "remove") return `Removed ${log.productName} (was ×${log.quantityBefore})`;
  if (log.action === "update_quantity")
    return `${log.productName}: ${log.quantityBefore} → ${log.quantityAfter}`;
  return log.action;
}

export default function OrderDetail({ orderId }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EditLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

  async function fetchHistory() {
    const res = await fetch(`/api/orders/${orderId}/history`);
    if (res.ok) setHistory(await res.json());
  }

  useEffect(() => {
    fetchOrder();
    fetchProducts();
    fetchHistory();
  }, [orderId]);

  async function addItem(productId: string) {
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/add-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    }
    fetchOrder();
    fetchHistory();
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    }
    fetchOrder();
    fetchHistory();
  }

  async function removeItem(itemId: string) {
    setError(null);
    await fetch(`/api/orders/${orderId}/items/${itemId}`, { method: "DELETE" });
    fetchOrder();
    fetchHistory();
  }

  async function cancelOrder() {
    setShowCancelModal(false);
    setCancelling(true);
    const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error);
      setCancelling(false);
    }
  }

  async function payOrder() {
    if (!order || order.items.length === 0) return;
    setError(null);
    setPaying(true);
    const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error);
      setPaying(false);
    }
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-xl">
        Loading...
      </div>
    );
  }

  const isPaid = order.status === "paid";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-4 py-3 sm:py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="shrink-0 text-blue-600 font-semibold text-base sm:text-lg px-1 py-1"
            >
              ←
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{order.label}</h1>
          </div>

          {!isPaid && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancelling}
                className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-100 text-gray-500 rounded-xl font-semibold text-sm sm:text-base disabled:opacity-50 active:bg-gray-200"
              >
                {cancelling ? "…" : "Cancel order"}
              </button>
              <button
                onClick={payOrder}
                disabled={paying || order.items.length === 0}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-xl font-bold text-sm sm:text-lg disabled:opacity-50 active:bg-green-700"
              >
                {paying ? "…" : "Pay & Close"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            Order Summary
          </h2>
          {order.items.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No items yet. Add products below.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3 gap-3">
                  <span className="text-base sm:text-lg font-medium text-gray-800 flex-1">
                    {item.product.name}
                  </span>
                  {!isPaid ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center active:bg-gray-200 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="text-lg font-bold text-gray-900 w-7 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center active:bg-gray-200"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-1 w-8 h-8 rounded-full bg-red-50 text-red-500 font-bold flex items-center justify-center active:bg-red-100"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-lg sm:text-xl font-bold text-gray-900 bg-gray-100 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                      {item.quantity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isPaid && <ProductGrid products={products} onAdd={addItem} />}

        {isPaid && (
          <div className="text-center py-6 text-gray-500 font-semibold text-base sm:text-lg bg-gray-100 rounded-2xl">
            Order closed.
          </div>
        )}

        {/* Edit history */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-base sm:text-lg font-semibold text-gray-600 uppercase tracking-wide">
                Edit History ({history.length})
              </span>
              <span className="text-gray-400 text-lg">{showHistory ? "▲" : "▼"}</span>
            </button>
            {showHistory && (
              <ul className="divide-y divide-gray-100 px-4 pb-3">
                {history.map((log) => (
                  <li key={log.id} className="py-2 flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-700">{formatAction(log)}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Cancel order?</h2>
            <p className="text-gray-500 text-sm mb-6">
              This will free the table. The order history will be kept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold active:bg-gray-200"
              >
                Keep it
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold active:bg-red-600"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
