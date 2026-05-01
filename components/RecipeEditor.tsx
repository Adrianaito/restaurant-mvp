"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Ingredient = { id: string; name: string; unit: string };
type RecipeItem = { ingredientId: string; amount: number };
type Product = {
  id: string;
  name: string;
  price: number;
  vatRate: number;
  portionsPerUnit: number;
  recipeItems: {
    ingredientId: string;
    amount: number;
    ingredient: { id: string; name: string; unit: string };
  }[];
};

type ParsedIngredient = { name: string; amount: number; unit: string };
type MatchResult =
  | { status: "matched"; ingredient: Ingredient; amount: number }
  | { status: "unmatched"; name: string; amount: number; unit: string };

const COMMON_UNITS = ["kg", "g", "L", "ml", "unit", "cup", "tbsp", "tsp"];

export default function RecipeEditor() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [portionsPerUnit, setPortionsPerUnit] = useState(1);
  const [price, setPrice] = useState(0);
  const [vatRate, setVatRate] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductVatRate, setNewProductVatRate] = useState("10");
  const [addingProduct, setAddingProduct] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const [ingSearch, setIngSearch] = useState("");
  const [ingUnit, setIngUnit] = useState("kg");
  const [ingCustomUnit, setIngCustomUnit] = useState("");
  const [addingIng, setAddingIng] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResults, setParseResults] = useState<MatchResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [addingUnmatchedIdx, setAddingUnmatchedIdx] = useState<number | null>(null);

  async function fetchData() {
    const [prods, ings] = await Promise.all([
      fetch("/api/recipes").then((r) => r.json()),
      fetch("/api/ingredients").then((r) => r.json()),
    ]);
    setProducts(prods);
    setIngredients(ings);
  }

  useEffect(() => { fetchData(); }, []);

  async function addProduct() {
    if (!newProductName.trim()) return;
    setAddingProduct(true);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProductName.trim(), price: parseFloat(newProductPrice) || 0, vatRate: parseFloat(newProductVatRate) || 10 }),
    });
    setNewProductName("");
    setNewProductPrice("");
    setNewProductVatRate("10");
    setShowAddProduct(false);
    setAddingProduct(false);
    fetchData();
  }

  async function deleteProduct(id: string) {
    if (selectedProductId === id) {
      setSelectedProductId(null);
      setRecipeItems([]);
    }
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setSaved(false);
    setParseResults(null);
    setParseError(null);
    setIngSearch("");
    const product = products.find((p) => p.id === productId);
    setPortionsPerUnit(product?.portionsPerUnit ?? 1);
    setPrice(product?.price ?? 0);
    setVatRate(product?.vatRate ?? 10);
    setRecipeItems(
      product
        ? product.recipeItems.map((ri) => ({ ingredientId: ri.ingredientId, amount: ri.amount }))
        : []
    );
  }

  const availableIngredients = ingredients.filter(
    (ing) => !recipeItems.some((ri) => ri.ingredientId === ing.id)
  );
  const searchTrimmed = ingSearch.trim().toLowerCase();
  const filteredIngredients = searchTrimmed
    ? availableIngredients.filter((ing) => ing.name.toLowerCase().includes(searchTrimmed))
    : availableIngredients;
  const exactMatch = ingredients.find((ing) => ing.name.toLowerCase() === searchTrimmed);
  const alreadyOnRecipe = exactMatch ? recipeItems.some((ri) => ri.ingredientId === exactMatch.id) : false;
  const showCreateOption = searchTrimmed.length > 0 && !exactMatch && !alreadyOnRecipe;

  function addIngredientToRecipe(ingredientId: string) {
    if (recipeItems.some((ri) => ri.ingredientId === ingredientId)) return;
    setRecipeItems((prev) => [...prev, { ingredientId, amount: 1 }]);
    setIngSearch("");
    setSaved(false);
  }

  async function createAndAddIngredient() {
    if (!searchTrimmed) return;
    setAddingIng(true);
    const unit = ingUnit === "__custom__" ? ingCustomUnit.trim() : ingUnit;
    const duplicate = ingredients.find((ing) => ing.name.toLowerCase() === searchTrimmed);
    if (duplicate) {
      addIngredientToRecipe(duplicate.id);
      setAddingIng(false);
      return;
    }
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ingSearch.trim(), stock: 0, unit }),
    });
    const created = await res.json();
    await fetchData();
    addIngredientToRecipe(created.id);
    setIngUnit("kg");
    setIngCustomUnit("");
    setAddingIng(false);
  }

  function updateAmount(ingredientId: string, value: string) {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    setRecipeItems((prev) =>
      prev.map((ri) => (ri.ingredientId === ingredientId ? { ...ri, amount } : ri))
    );
    setSaved(false);
  }

  function removeItem(ingredientId: string) {
    setRecipeItems((prev) => prev.filter((ri) => ri.ingredientId !== ingredientId));
    setSaved(false);
  }

  async function saveRecipe() {
    if (!selectedProductId) return;
    setSaving(true);
    await Promise.all([
      fetch("/api/recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, items: recipeItems, portionsPerUnit }),
      }),
      fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProductId, price, vatRate }),
      }),
    ]);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === selectedProductId
          ? {
              ...p,
              recipeItems: recipeItems.map((ri) => ({
                ...ri,
                ingredient: ingredients.find((i) => i.id === ri.ingredientId)!,
              })),
            }
          : p
      )
    );
    setSaving(false);
    setSaved(true);
    setParseResults(null);
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseResults(null);
    setParseError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/recipes/parse", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok || data.error) {
      setParseError(data.error ?? "Failed to parse PDF.");
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const parsed: ParsedIngredient[] = data.ingredients ?? [];
    const results: MatchResult[] = parsed.map((p) => {
      const match = ingredients.find((ing) => ing.name.toLowerCase() === p.name.toLowerCase());
      return match
        ? { status: "matched", ingredient: match, amount: p.amount }
        : { status: "unmatched", name: p.name, amount: p.amount, unit: p.unit };
    });
    setParseResults(results);
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyParsedRecipe() {
    if (!parseResults) return;
    const matched = parseResults.filter(
      (r): r is Extract<MatchResult, { status: "matched" }> => r.status === "matched"
    );
    setRecipeItems((prev) => {
      const next = [...prev];
      for (const m of matched) {
        const idx = next.findIndex((ri) => ri.ingredientId === m.ingredient.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], amount: m.amount };
        } else {
          next.push({ ingredientId: m.ingredient.id, amount: m.amount });
        }
      }
      return next;
    });
    setSaved(false);
    setParseResults(null);
  }

  async function addUnmatchedIngredient(index: number) {
    if (!parseResults) return;
    const result = parseResults[index];
    if (result.status !== "unmatched") return;
    setAddingUnmatchedIdx(index);
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: result.name, stock: 0, unit: result.unit }),
    });
    const created = await res.json();
    await fetchData();
    setParseResults((prev) =>
      prev
        ? prev.map((r, i) =>
            i === index ? { status: "matched", ingredient: created, amount: result.amount } : r
          )
        : prev
    );
    setAddingUnmatchedIdx(null);
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
          <h1 className="text-lg font-semibold text-slate-900">Recipes</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Product selector */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Products</p>
            <button
              onClick={() => setShowAddProduct((v) => !v)}
              className="text-xs font-semibold text-indigo-600 active:text-indigo-800"
            >
              {showAddProduct ? "Cancel" : "+ Add product"}
            </button>
          </div>

          {showAddProduct && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Product name…"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProduct()}
                className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="w-24 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={newProductVatRate}
                onChange={(e) => setNewProductVatRate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="4">IVA 4%</option>
                <option value="10">IVA 10%</option>
                <option value="21">IVA 21%</option>
              </select>
              <button
                onClick={addProduct}
                disabled={addingProduct || !newProductName.trim()}
                className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg disabled:opacity-50 active:bg-indigo-700"
              >
                Add
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {products.length === 0 && (
              <p className="text-slate-400 text-sm">No products yet. Add one above.</p>
            )}
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <button
                  onClick={() => selectProduct(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedProductId === p.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-300 active:bg-slate-50"
                  }`}
                >
                  {p.name}
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="text-slate-300 hover:text-red-400 text-lg leading-none px-1 transition-colors"
                  aria-label={`Delete ${p.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {selectedProductId && (
          <>
            {/* PDF import */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Import from PDF
              </p>
              <p className="text-sm text-slate-400 mb-3">
                Upload a recipe PDF and AI will extract the ingredients automatically.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg disabled:opacity-50 active:bg-violet-700"
              >
                {parsing ? "Reading PDF…" : "Upload PDF"}
              </button>

              {parseError && (
                <p className="mt-3 text-sm text-red-500 font-medium">{parseError}</p>
              )}

              {parseResults && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Found {parseResults.length} ingredient{parseResults.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {parseResults.map((r, i) =>
                      r.status === "matched" ? (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span className="font-medium text-slate-800">{r.ingredient.name}</span>
                          <span className="text-slate-400">{r.amount} {r.ingredient.unit}</span>
                        </li>
                      ) : (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-amber-500 font-bold shrink-0">!</span>
                          <span className="font-medium text-slate-800 flex-1">{r.name}</span>
                          <span className="text-slate-400 shrink-0">{r.amount} {r.unit}</span>
                          <button
                            onClick={() => addUnmatchedIngredient(i)}
                            disabled={addingUnmatchedIdx === i}
                            className="shrink-0 px-2.5 py-1 text-xs font-medium text-white bg-amber-500 rounded-lg disabled:opacity-50 active:bg-amber-600"
                          >
                            {addingUnmatchedIdx === i ? "Adding…" : "Add to inventory"}
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                  <div className="flex gap-2.5">
                    <button
                      onClick={applyParsedRecipe}
                      disabled={!parseResults.some((r) => r.status === "matched")}
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg disabled:opacity-40 active:bg-emerald-700"
                    >
                      Apply matched
                    </button>
                    <button
                      onClick={() => setParseResults(null)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg active:bg-slate-200"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Price + VAT + Portions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Price <span className="font-normal text-slate-400">(IVA incl.)</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">Selling price per portion</p>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => { setPrice(parseFloat(e.target.value) || 0); setSaved(false); }}
                  className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">IVA</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {price > 0
                      ? `Base: ${(price / (1 + vatRate / 100)).toFixed(2)} € + IVA: ${(price - price / (1 + vatRate / 100)).toFixed(2)} €`
                      : "Set a price to see the breakdown"}
                  </p>
                </div>
                <select
                  value={vatRate}
                  onChange={(e) => { setVatRate(parseFloat(e.target.value)); setSaved(false); }}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value={4}>4%</option>
                  <option value={10}>10%</option>
                  <option value={21}>21%</option>
                </select>
              </div>
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Portions per unit</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    How many portions does 1 unit yield?
                  </p>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={portionsPerUnit}
                  onChange={(e) => { setPortionsPerUnit(Math.max(1, parseInt(e.target.value) || 1)); setSaved(false); }}
                  className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Current recipe items */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {recipeItems.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm">No ingredients yet. Add one below.</p>
              )}
              <div className="divide-y divide-slate-100">
                {recipeItems.map((ri) => {
                  const ing = ingredients.find((i) => i.id === ri.ingredientId);
                  if (!ing) return null;
                  return (
                    <div key={ri.ingredientId} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="flex-1 text-sm font-medium text-slate-800 min-w-0 truncate">
                        {ing.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={ri.amount}
                          onChange={(e) => updateAmount(ri.ingredientId, e.target.value)}
                          className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-slate-400 text-xs w-8">{ing.unit}</span>
                      </div>
                      <button
                        onClick={() => removeItem(ri.ingredientId)}
                        className="shrink-0 text-slate-300 hover:text-red-400 text-xl font-light leading-none transition-colors"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add ingredient */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Add ingredient
              </p>

              <input
                type="text"
                placeholder="Search or type a new ingredient…"
                value={ingSearch}
                onChange={(e) => { setIngSearch(e.target.value); setSaved(false); }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />

              {searchTrimmed && filteredIngredients.length > 0 && (
                <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 mb-3">
                  {filteredIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => addIngredientToRecipe(ing.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 active:bg-slate-100"
                    >
                      <span className="text-sm font-medium text-slate-800">{ing.name}</span>
                      <span className="text-xs text-slate-400">{ing.unit}</span>
                    </button>
                  ))}
                </div>
              )}

              {exactMatch && alreadyOnRecipe && (
                <p className="text-sm text-slate-400 mb-3">
                  <span className="font-medium text-slate-600">{exactMatch.name}</span> is already in this recipe.
                </p>
              )}

              {showCreateOption && (
                <div className="border border-dashed border-slate-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    Create new ingredient: <span className="text-indigo-600">{ingSearch.trim()}</span>
                  </p>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Unit</label>
                      <select
                        value={ingUnit}
                        onChange={(e) => setIngUnit(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        <option value="__custom__">Other…</option>
                      </select>
                    </div>
                    {ingUnit === "__custom__" && (
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Custom unit</label>
                        <input
                          type="text"
                          value={ingCustomUnit}
                          onChange={(e) => setIngCustomUnit(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Starts with 0 stock — update in Inventory when needed.</p>
                  <button
                    onClick={createAndAddIngredient}
                    disabled={addingIng || (ingUnit === "__custom__" && !ingCustomUnit.trim())}
                    className="w-full py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg disabled:opacity-50 active:bg-indigo-700"
                  >
                    {addingIng ? "Adding…" : `Add "${ingSearch.trim()}"`}
                  </button>
                </div>
              )}

              {!searchTrimmed && availableIngredients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => addIngredientToRecipe(ing.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 active:bg-slate-200"
                    >
                      + {ing.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={saveRecipe}
              disabled={saving}
              className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg disabled:opacity-50 active:bg-indigo-700"
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save Recipe"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
