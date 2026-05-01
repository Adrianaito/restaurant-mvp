"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  portionsPerUnit: number;
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
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [units, setUnits] = useState("1");
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
  const unitsNum = parseInt(units, 10) || 0;
  const totalPortions = selectedProduct ? unitsNum * selectedProduct.portionsPerUnit : 0;

  const preview: PreviewLine[] =
    selectedProduct && unitsNum > 0
      ? selectedProduct.recipeItems.map((ri) => {
          const required = ri.amount * unitsNum;
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
    unitsNum > 0 &&
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
      body: JSON.stringify({ productId: selectedProductId, units: unitsNum }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLogError(data.error ?? "Failed to log production.");
      if (data.shortfalls) setShortfalls(data.shortfalls);
      setLogging(false);
      return;
    }

    setUnits("1");
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
          <h1 className="text-lg font-semibold text-slate-900">Production</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Log a batch */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Log a batch
          </p>

          {/* Product picker */}
          <div className="flex flex-wrap gap-2 mb-4">
            {products.length === 0 && (
              <p className="text-slate-400 text-sm">
                No products yet.{" "}
                <Link href="/recipes" className="text-indigo-600 font-medium">
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedProductId === p.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-300 active:bg-slate-50"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {selectedProduct && (
            <>
              {/* Units input */}
              <div className="flex items-end gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Units made</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={units}
                    onChange={(e) => {
                      setUnits(e.target.value);
                      setLogError(null);
                      setShortfalls([]);
                    }}
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {selectedProduct.portionsPerUnit > 1 && (
                  <p className="pb-2.5 text-sm text-slate-500">
                    → <span className="font-semibold text-slate-800">{totalPortions}</span> portions
                    <span className="text-slate-400 ml-1">({unitsNum} × {selectedProduct.portionsPerUnit})</span>
                  </p>
                )}
              </div>

              {/* Ingredient preview */}
              {selectedProduct.recipeItems.length === 0 ? (
                <p className="text-sm text-amber-600 font-medium mb-4">
                  This product has no recipe.{" "}
                  <Link href="/recipes" className="underline">Add one in Recipes.</Link>
                </p>
              ) : (
                <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 mb-4">
                  {preview.map((line) => (
                    <div
                      key={line.name}
                      className={`flex items-center justify-between px-4 py-3 ${line.ok ? "" : "bg-red-50"}`}
                    >
                      <div className="flex items-center gap-2">
                        {line.ok ? (
                          <span className="text-emerald-500 font-bold text-xs">✓</span>
                        ) : (
                          <span className="text-red-500 font-bold text-xs">✗</span>
                        )}
                        <span className={`text-sm font-medium ${line.ok ? "text-slate-800" : "text-red-700"}`}>
                          {line.name}
                        </span>
                      </div>
                      <div className="text-right text-sm">
                        <span className={`font-medium ${line.ok ? "text-slate-700" : "text-red-600"}`}>
                          {line.required} {line.unit}
                        </span>
                        <span className="text-slate-400 ml-1">(have {line.stock})</span>
                        {!line.ok && (
                          <p className="text-red-500 text-xs font-medium mt-0.5">
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
                className="w-full py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg disabled:opacity-50 active:bg-indigo-700"
              >
                {logging
                  ? "Logging…"
                  : `Log ${unitsNum} ${unitsNum !== 1 ? "units" : "unit"} of ${selectedProduct.name} (${totalPortions} portions)`}
              </button>
            </>
          )}
        </div>

        {/* Production history */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">History</p>
          </div>
          {productions.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No productions logged yet.</p>
          )}
          <div className="divide-y divide-slate-100">
            {productions.map((prod) => {
              const remaining = prod.portionsMade - prod.soldCount;
              return (
                <div key={prod.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{prod.product.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(prod.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{prod.portionsMade}</span> made
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{prod.soldCount}</span> sold
                      </div>
                      <div className={`text-xs font-semibold ${
                        remaining === 0 ? "text-slate-400" : remaining <= 2 ? "text-red-500" : "text-emerald-600"
                      }`}>
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
    </div>
  );
}
