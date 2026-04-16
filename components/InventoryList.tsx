"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ingredient = { id: string; name: string; stock: number; unit: string };

const LOW_STOCK_THRESHOLD = 1;
const COMMON_UNITS = ["kg", "g", "L", "ml", "unit", "cup", "tbsp", "tsp"];

export default function InventoryList() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStock, setNewStock] = useState("0");
  const [newUnit, setNewUnit] = useState("kg");
  const [customUnit, setCustomUnit] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline stock editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");

  async function fetchIngredients() {
    const res = await fetch("/api/ingredients");
    setIngredients(await res.json());
  }

  useEffect(() => { fetchIngredients(); }, []);

  async function addIngredient() {
    const unit = newUnit === "__custom__" ? customUnit.trim() : newUnit;
    if (!newName.trim() || !unit) return;
    setAdding(true);
    await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), stock: newStock, unit }),
    });
    setNewName("");
    setNewStock("0");
    setNewUnit("kg");
    setCustomUnit("");
    setShowAdd(false);
    setAdding(false);
    fetchIngredients();
  }

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id);
    setEditStock(String(ing.stock));
  }

  async function saveStock(id: string) {
    await fetch("/api/ingredients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock: editStock }),
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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
          <div className="flex gap-2">
            <Link
              href="/recipes"
              className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-base sm:text-lg"
            >
              Recipes
            </Link>
            <Link
              href="/"
              className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-base sm:text-lg"
            >
              ← Orders
            </Link>
          </div>
        </div>

        {/* Add ingredient */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Add ingredient
            </p>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="text-sm font-semibold text-blue-600 active:text-blue-800"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Initial stock</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              )}
              <button
                onClick={addIngredient}
                disabled={adding || !canAdd}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-50 active:bg-blue-700"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          )}
        </div>

        {/* Ingredient list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {ingredients.length === 0 && (
            <p className="text-center py-10 text-gray-400">No ingredients yet. Add one above.</p>
          )}
          {ingredients.map((ing) => {
            const isLow = ing.stock <= LOW_STOCK_THRESHOLD;
            const isEditing = editingId === ing.id;
            return (
              <div
                key={ing.id}
                className={`px-4 sm:px-5 py-4 ${isLow ? "bg-red-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {isLow && (
                      <span className="text-red-500 text-lg shrink-0" title="Low stock">⚠</span>
                    )}
                    <span className={`text-lg sm:text-xl font-medium truncate ${isLow ? "text-red-700" : "text-gray-800"}`}>
                      {ing.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
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
                          className="w-20 border border-blue-400 rounded-xl px-2 py-1.5 text-base text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                          autoFocus
                        />
                        <span className="text-gray-400 text-sm">{ing.unit}</span>
                        <button
                          onClick={() => saveStock(ing.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold active:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-right">
                          <span className={`text-xl sm:text-2xl font-bold ${isLow ? "text-red-600" : "text-gray-900"}`}>
                            {ing.stock.toFixed(1)}
                          </span>
                          <span className="text-gray-400 text-sm ml-1">{ing.unit}</span>
                          {isLow && (
                            <p className="text-red-500 text-xs font-semibold mt-0.5">LOW STOCK</p>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(ing)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold active:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteIngredient(ing.id)}
                          className="text-gray-300 hover:text-red-400 text-2xl font-light leading-none"
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
  );
}
