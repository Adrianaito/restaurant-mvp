"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Ingredient = { id: string; name: string; stock: number; unit: string; lowStockThreshold: number | null };
type Production = {
  productId: string;
  portionsMade: number;
  soldCount: number;
  product: { name: string; lowPortionsThreshold: number | null };
};
type BatchStock = { productId: string; name: string; available: number; lowPortionsThreshold: number | null };

const COMMON_UNITS = ["kg", "g", "L", "ml", "unit", "cup", "tbsp", "tsp"];

export default function InventoryList() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [batchStock, setBatchStock] = useState<BatchStock[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStock, setNewStock] = useState("0");
  const [newUnit, setNewUnit] = useState("kg");
  const [customUnit, setCustomUnit] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editBatchThreshold, setEditBatchThreshold] = useState("");

  async function saveBatchThreshold(productId: string) {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: productId, lowPortionsThreshold: editBatchThreshold }),
    });
    setEditingBatchId(null);
    fetchBatchStock();
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCustomUnit, setEditCustomUnit] = useState("");
  const [editThreshold, setEditThreshold] = useState("");

  async function fetchIngredients() {
    const res = await fetch("/api/ingredients");
    setIngredients(await res.json());
  }

  async function fetchBatchStock() {
    const res = await fetch("/api/productions");
    const productions: Production[] = await res.json();
    const map = new Map<string, BatchStock>();
    for (const p of productions) {
      const existing = map.get(p.productId);
      if (existing) {
        existing.available += p.portionsMade - p.soldCount;
      } else {
        map.set(p.productId, {
          productId: p.productId,
          name: p.product.name,
          available: p.portionsMade - p.soldCount,
          lowPortionsThreshold: p.product.lowPortionsThreshold,
        });
      }
    }
    setBatchStock(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
  }

  useEffect(() => {
    fetchIngredients();
    fetchBatchStock();
  }, []);

  async function addIngredient() {
    const unit = newUnit === "__custom__" ? customUnit.trim() : newUnit;
    if (!newName.trim() || !unit) return;
    setAdding(true);
    await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), stock: newStock, unit, lowStockThreshold: newThreshold }),
    });
    setNewName("");
    setNewStock("0");
    setNewUnit("kg");
    setCustomUnit("");
    setNewThreshold("");
    setShowAdd(false);
    setAdding(false);
    fetchIngredients();
  }

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id);
    setEditStock(String(ing.stock));
    setEditThreshold(ing.lowStockThreshold != null ? String(ing.lowStockThreshold) : "");
    const isKnown = COMMON_UNITS.includes(ing.unit);
    setEditUnit(isKnown ? ing.unit : "__custom__");
    setEditCustomUnit(isKnown ? "" : ing.unit);
  }

  async function saveStock(id: string) {
    const unit = editUnit === "__custom__" ? editCustomUnit.trim() : editUnit;
    if (!unit) return;
    await fetch("/api/ingredients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock: editStock, lowStockThreshold: editThreshold, unit }),
    });
    setEditingId(null);
    fetchIngredients();
  }

  async function deleteIngredient(id: string) {
    await fetch("/api/ingredients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchIngredients();
  }

  const unitValue = newUnit === "__custom__" ? customUnit : newUnit;
  const canAdd = newName.trim() && unitValue.trim();

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
          <h1 className="text-lg font-semibold text-slate-900">Inventory</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Add ingredient */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add ingredient</p>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="text-xs font-semibold text-indigo-600 active:text-indigo-800"
            >
              {showAdd ? "Cancel" : "+ New"}
            </button>
          </div>

          {showAdd && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name (e.g. Flour)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Initial stock</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="__custom__">Other…</option>
                  </select>
                </div>
              </div>
              {newUnit === "__custom__" && (
                <input
                  type="text"
                  placeholder="Custom unit"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <button
                onClick={addIngredient}
                disabled={adding || !canAdd}
                className="w-full py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg disabled:opacity-50 active:bg-indigo-700"
              >
                {adding ? "Adding…" : "Add ingredient"}
              </button>
            </div>
          )}
        </div>

        {/* Batch stock */}
        {batchStock.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Batch stock</p>
            </div>
            <div className="divide-y divide-slate-100">
              {batchStock.map((b) => {
                const isOut = b.available <= 0;
                const isLow = !isOut && b.lowPortionsThreshold != null && b.available <= b.lowPortionsThreshold;
                const isEditing = editingBatchId === b.productId;
                return (
                  <div key={b.productId} className={`px-4 py-3.5 flex items-center justify-between gap-3 ${isOut ? "bg-red-50" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {(isOut || isLow) && (
                        <svg className={`w-4 h-4 shrink-0 ${isOut ? "text-red-500" : "text-amber-500"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-sm font-medium truncate ${isOut ? "text-red-700" : "text-slate-800"}`}>
                        {b.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Warn below</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="—"
                              value={editBatchThreshold}
                              onChange={(e) => setEditBatchThreshold(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveBatchThreshold(b.productId);
                                if (e.key === "Escape") setEditingBatchId(null);
                              }}
                              className="w-20 border border-indigo-400 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                            <span className="text-slate-400 text-xs">portions</span>
                          </div>
                          <button onClick={() => saveBatchThreshold(b.productId)} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg active:bg-indigo-700">Save</button>
                          <button onClick={() => setEditingBatchId(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg active:bg-slate-200">Cancel</button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-900"}`}>
                              {b.available}
                            </span>
                            <span className="text-slate-400 text-xs ml-1">portions</span>
                            {isOut && <p className="text-red-500 text-xs font-semibold mt-0.5">SOLD OUT</p>}
                            {isLow && <p className="text-amber-600 text-xs font-semibold mt-0.5">LOW</p>}
                            {b.lowPortionsThreshold != null && !isLow && !isOut && (
                              <p className="text-slate-300 text-xs mt-0.5">warn &lt; {b.lowPortionsThreshold}</p>
                            )}
                          </div>
                          <button
                            onClick={() => { setEditingBatchId(b.productId); setEditBatchThreshold(b.lowPortionsThreshold != null ? String(b.lowPortionsThreshold) : ""); }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg active:bg-slate-200"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ingredient list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingredients</p>
          </div>
          {ingredients.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No ingredients yet. Add one above.</p>
          )}
          <div className="divide-y divide-slate-100">
            {ingredients.map((ing) => {
              const isLow = ing.lowStockThreshold != null && ing.stock <= ing.lowStockThreshold;
              const isEditing = editingId === ing.id;
              return (
                <div key={ing.id} className={`px-4 py-3.5 ${isLow ? "bg-red-50" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isLow && (
                        <svg className="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-sm font-medium truncate ${isLow ? "text-red-700" : "text-slate-800"}`}>
                        {ing.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <div className="flex flex-col gap-1.5 items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Stock</span>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={editStock}
                                onChange={(e) => setEditStock(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveStock(ing.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                className="w-20 border border-indigo-400 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Unit</span>
                              <select
                                value={editUnit}
                                onChange={(e) => setEditUnit(e.target.value)}
                                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                {COMMON_UNITS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                                <option value="__custom__">Other…</option>
                              </select>
                              {editUnit === "__custom__" && (
                                <input
                                  type="text"
                                  value={editCustomUnit}
                                  onChange={(e) => setEditCustomUnit(e.target.value)}
                                  placeholder="unit"
                                  className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Warn below</span>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="—"
                                value={editThreshold}
                                onChange={(e) => setEditThreshold(e.target.value)}
                                className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="text-slate-400 text-xs">
                                {editUnit === "__custom__" ? editCustomUnit || "—" : editUnit}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => saveStock(ing.id)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg active:bg-indigo-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg active:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${isLow ? "text-red-600" : "text-slate-900"}`}>
                              {ing.stock.toFixed(1)}
                            </span>
                            <span className="text-slate-400 text-xs ml-1">{ing.unit}</span>
                            {isLow && (
                              <p className="text-red-500 text-xs font-semibold mt-0.5">LOW STOCK</p>
                            )}
                            {ing.lowStockThreshold != null && !isLow && (
                              <p className="text-slate-300 text-xs mt-0.5">warn &lt; {ing.lowStockThreshold}</p>
                            )}
                          </div>
                          <button
                            onClick={() => startEdit(ing)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg active:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteIngredient(ing.id)}
                            className="text-slate-300 hover:text-red-400 text-xl font-light leading-none"
                            aria-label="Delete"
                          >
                            ×
                          </button>
                        </>
                      )}
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
