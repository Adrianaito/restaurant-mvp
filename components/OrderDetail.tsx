"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductGrid from "./ProductGrid";

type OrderItem = {
  id: string;
  quantity: number;
  product: { id: string; name: string; price: number; vatRate: number };
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
  if (log.action === "remove") return `Removed ${log.productName} (×${log.quantityBefore})`;
  if (log.action === "remove_return") return `Removed ${log.productName} — returned to inventory (×${log.quantityBefore})`;
  if (log.action === "remove_defect") return `Removed ${log.productName} — defect/waste (×${log.quantityBefore})`;
  if (log.action === "remove_comp") return `Removed ${log.productName} — complimentary (×${log.quantityBefore})`;
  if (log.action === "update_quantity")
    return `${log.productName}: ${log.quantityBefore} → ${log.quantityAfter}`;
  return log.action;
}

export default function OrderDetail({ orderId }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [removeModal, setRemoveModal] = useState<{
    itemId: string;
    productName: string;
    currentQuantity: number;
    fullRemove: boolean;
  } | null>(null);
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

  async function removeItem(itemId: string, reason: string) {
    setError(null);
    setRemoveModal(null);
    await fetch(`/api/orders/${orderId}/items/${itemId}?reason=${reason}`, { method: "DELETE" });
    fetchOrder();
    fetchHistory();
  }

  async function decrementItem(itemId: string, newQuantity: number, reason: string) {
    setError(null);
    setRemoveModal(null);
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQuantity, reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    }
    fetchOrder();
    fetchHistory();
  }

  function handleModalAction(reason: string) {
    if (!removeModal) return;
    if (removeModal.fullRemove || !order || order.status === "draft") {
      removeItem(removeModal.itemId, reason);
    } else {
      decrementItem(removeModal.itemId, removeModal.currentQuantity - 1, reason);
    }
  }

  async function confirmOrder() {
    if (!order || order.items.length === 0) return;
    setError(null);
    setConfirming(true);
    const res = await fetch(`/api/orders/${orderId}/confirm`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    } else {
      fetchOrder();
    }
    setConfirming(false);
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
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  const isPaid = order.status === "paid";
  const isConfirmed = order.status === "confirmed";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="shrink-0 p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-900 truncate">{order.label}</h1>
              {!isPaid && (
                <span className={`text-xs font-medium ${isConfirmed ? "text-emerald-600" : "text-amber-600"}`}>
                  {isConfirmed ? "Confirmed" : "Draft"}
                </span>
              )}
            </div>
          </div>

          {!isPaid && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancelling}
                className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg active:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                {cancelling ? "…" : "Cancel"}
              </button>
              {order.status === "draft" && (
                <button
                  onClick={confirmOrder}
                  disabled={confirming || order.items.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg active:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {confirming ? "…" : "Confirm"}
                </button>
              )}
              {isConfirmed && (
                <button
                  onClick={payOrder}
                  disabled={paying}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg active:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {paying ? "…" : "Pay & Close"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Order items */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order</p>
          </div>
          {order.items.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">No items yet. Add products below.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800 block truncate">
                      {item.product.name}
                    </span>
                    {item.product.price > 0 && (
                      <span className="text-xs text-slate-400">
                        {item.product.price.toFixed(2)} × {item.quantity} = {(item.product.price * item.quantity).toFixed(2)} €
                      </span>
                    )}
                  </div>
                  {!isPaid ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          isConfirmed || item.quantity === 1
                            ? setRemoveModal({ itemId: item.id, productName: item.product.name, currentQuantity: item.quantity, fullRemove: item.quantity === 1 })
                            : updateQuantity(item.id, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-semibold text-base flex items-center justify-center active:bg-slate-200"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold text-slate-900 w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-semibold text-base flex items-center justify-center active:bg-slate-200"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setRemoveModal({ itemId: item.id, productName: item.product.name, currentQuantity: item.quantity, fullRemove: true })}
                        className="ml-1 w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center active:bg-red-100 text-sm"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-slate-700 bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                      {item.quantity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* IVA breakdown */}
          {order.items.length > 0 && order.items.some((i) => i.product.price > 0) && (() => {
            const total = order.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
            const ivaByRate = new Map<number, number>();
            for (const i of order.items) {
              const lineTotal = i.product.price * i.quantity;
              const iva = lineTotal - lineTotal / (1 + i.product.vatRate / 100);
              ivaByRate.set(i.product.vatRate, (ivaByRate.get(i.product.vatRate) ?? 0) + iva);
            }
            const base = total - Array.from(ivaByRate.values()).reduce((s, v) => s + v, 0);
            return (
              <div className="px-4 py-3 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Base imponible</span>
                  <span>{base.toFixed(2)} €</span>
                </div>
                {Array.from(ivaByRate.entries()).sort(([a], [b]) => a - b).map(([rate, iva]) => (
                  <div key={rate} className="flex justify-between text-xs text-slate-400">
                    <span>IVA {rate}%</span>
                    <span>{iva.toFixed(2)} €</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-lg font-bold text-slate-900">{total.toFixed(2)} €</span>
                </div>
              </div>
            );
          })()}
        </div>

        {!isPaid && <ProductGrid products={products} onAdd={addItem} />}

        {isPaid && (
          <div className="text-center py-6 text-slate-500 text-sm font-medium bg-white rounded-xl border border-slate-200">
            Order closed.
          </div>
        )}

        {/* Edit history */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-slate-50"
            >
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Edit history ({history.length})
              </span>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${showHistory ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showHistory && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {history.map((log) => (
                  <li key={log.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                    <span className="text-sm text-slate-600">{formatAction(log)}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Remove item modal */}
      {removeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRemoveModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-full max-w-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              {isConfirmed && !removeModal.fullRemove
                ? `Remove 1× ${removeModal.productName}?`
                : `Remove ${removeModal.productName}?`}
            </h2>
            {isConfirmed ? (
              <>
                <p className="text-slate-500 text-sm mb-4">Choose how to handle this item:</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleModalAction("return")}
                    className="w-full py-3 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-sm active:bg-indigo-100 text-left px-4"
                  >
                    Return to inventory
                    <span className="block text-xs font-normal text-indigo-400 mt-0.5">Item was not used — stock restored</span>
                  </button>
                  <button
                    onClick={() => handleModalAction("defect")}
                    className="w-full py-3 rounded-lg bg-amber-50 text-amber-700 font-medium text-sm active:bg-amber-100 text-left px-4"
                  >
                    Defect / Waste
                    <span className="block text-xs font-normal text-amber-500 mt-0.5">Item was wasted or defective</span>
                  </button>
                  <button
                    onClick={() => handleModalAction("comp")}
                    className="w-full py-3 rounded-lg bg-violet-50 text-violet-700 font-medium text-sm active:bg-violet-100 text-left px-4"
                  >
                    Complimentary
                    <span className="block text-xs font-normal text-violet-400 mt-0.5">Given to client at no charge</span>
                  </button>
                  <button
                    onClick={() => setRemoveModal(null)}
                    className="w-full py-3 rounded-lg bg-slate-100 text-slate-600 font-medium text-sm active:bg-slate-200"
                  >
                    Keep it
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-500 text-sm mb-5">This item will be removed from the order.</p>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setRemoveModal(null)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-sm active:bg-slate-200"
                  >
                    Keep it
                  </button>
                  <button
                    onClick={() => handleModalAction("return")}
                    className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm active:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-full max-w-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Cancel order?</h2>
            <p className="text-slate-500 text-sm mb-5">
              This will free the table. The order history will be kept.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-sm active:bg-slate-200"
              >
                Keep it
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm active:bg-red-600"
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
