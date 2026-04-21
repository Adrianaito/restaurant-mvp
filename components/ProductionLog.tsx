"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  recipeItems: {
    ingredientId: string;
    amount: number;
    ingredient: { id: string; name: string; unit: string; stock: number };
  }[];
};

type Production = {
  id: string;
  productId: string;
  portionsMade: number;
  soldCount: number;
  createdAt: string;
  product: { name: string };
};

type PreviewLine = {
  name: string;
  unit: string;
  required: number;
  stock: number;
  ok: boolean;
};

export default function ProductionLog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [portions, setPortions] = useState("1");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [shortfalls, setShortfalls] = useState<string[]>([]);

  async function fetchData() {
    const [prods, prodLog] = await Promise.all([
      fetch("/api/recipes").then((r) => r.json()),
      fetch("/api/productions").then((r) => r.json()),
    ]);
    setProducts(prods);
    setProductions(prodLog);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const portionsNum = parseInt(portions, 10) || 0;

  const preview: PreviewLine[] =
    selectedProduct && portionsNum > 0
      ? selectedProduct.recipeItems.map((ri) => {
          const required = ri.amount * portionsNum;
          return {
            name: ri.ingredient.name,
            unit: ri.ingredient.unit,
            required,
            stock: ri.ingredient.stock,
            ok: ri.ingredient.stock >= required,
          };
        })
      : [];

  const canLog =
    selectedProduct &&
    portionsNum > 0 &&
    selectedProduct.recipeItems.length > 0 &&
    preview.every((l) => l.ok);

  async function logProduction() {
    if (!selectedProductId || !canLog) return;
    setLogging(true);
    setLogError(null);
    setShortfalls([]);

    const res = await fetch("/api/productions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProductId, portions: portionsNum }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLogError(data.error ?? "Failed to log production.");
      if (data.shortfalls) setShortfalls(data.shortfalls);
      setLogging(false);
      return;
    }

    setPortions("1");
    setLogging(false);
    fetchData();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production</h1>
          <Link
            href="/"
            className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-base sm:text-lg"
          >
            ← Orders
          </Link>
        </div>

        {/* Log a batch */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4 sm:mb-6">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Log a batch
          </p>

          {/* Product picker */}
          <div className="flex flex-wrap gap-2 mb-4">
            {products.length === 0 && (
              <p className="text-gray-400 text-sm">
                No products yet.{" "}
                <Link href="/recipes" className="text-blue-600 font-semibold">
                  Add one in Recipes.
                </Link>
              </p>
            )}
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProductId(p.id);
                  setLogError(null);
                  setShortfalls([]);
                }}
                className={`px-4 py-2 rounded-xl font-semibold text-base border transition-colors ${
                  selectedProductId === p.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 active:bg-gray-50"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {selectedProduct && (
            <>
              {/* Portions input */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">Portions to make</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={portions}
                  onChange={(e) => {
                    setPortions(e.target.value);
                    setLogError(null);
                    setShortfalls([]);
                  }}
                  className="w-32 border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Ingredient preview */}
              {selectedProduct.recipeItems.length === 0 ? (
                <p className="text-sm text-yellow-600 font-medium mb-4">
                  This product has no recipe.{" "}
                  <Link href="/recipes" className="underline">
                    Add one in Recipes.
                  </Link>
                </p>
              ) : (
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-4">
                  {preview.map((line) => (
                    <div
                      key={line.name}
                      className={`flex items-center justify-between px-4 py-3 ${
                        line.ok ? "" : "bg-red-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {line.ok ? (
                          <span className="text-green-500 font-bold text-sm">✓</span>
                        ) : (
                          <span className="text-red-500 font-bold text-sm">✗</span>
                        )}
                        <span
                          className={`font-medium text-base ${
                            line.ok ? "text-gray-800" : "text-red-700"
                          }`}
                        >
                          {line.name}
                        </span>
                      </div>
                      <div className="text-right text-sm">
                        <span
                          className={`font-semibold ${
                            line.ok ? "text-gray-700" : "text-red-600"
                          }`}
                        >
                          {line.required} {line.unit}
                        </span>
                        <span className="text-gray-400 ml-1">
                          (have {line.stock})
                        </span>
                        {!line.ok && (
                          <p className="text-red-500 text-xs font-semibold">
                            short by {(line.required - line.stock).toFixed(1)} {line.unit}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {logError && (
                <p className="text-sm text-red-500 font-medium mb-3">{logError}</p>
              )}
              {shortfalls.length > 0 && (
                <ul className="text-xs text-red-500 mb-3 space-y-0.5">
                  {shortfalls.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              )}

              <button
                onClick={logProduction}
                disabled={logging || !canLog}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-50 active:bg-blue-700"
              >
                {logging
                  ? "Logging…"
                  : `Log ${portionsNum} portion${portionsNum !== 1 ? "s" : ""} of ${selectedProduct.name}`}
              </button>
            </>
          )}
        </div>

        {/* Production history */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <div className="px-4 sm:px-5 py-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              History
            </p>
          </div>
          {productions.length === 0 && (
            <p className="text-center py-10 text-gray-400">No productions logged yet.</p>
          )}
          {productions.map((prod) => {
            const remaining = prod.portionsMade - prod.soldCount;
            return (
              <div key={prod.id} className="px-4 sm:px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-base sm:text-lg truncate">
                      {prod.product.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(prod.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-0.5">
                    <div className="text-sm text-gray-500">
                      <span className="font-semibold text-gray-800">{prod.portionsMade}</span> made
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-semibold text-gray-800">{prod.soldCount}</span> sold
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        remaining === 0
                          ? "text-gray-400"
                          : remaining <= 2
                          ? "text-red-500"
                          : "text-green-600"
                      }`}
                    >
                      {remaining} left
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
