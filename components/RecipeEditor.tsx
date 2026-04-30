"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [portionsPerUnit, setPortionsPerUnit] = useState(1);
  const [price, setPrice] = useState(0);
  const [vatRate, setVatRate] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New product form
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductVatRate, setNewProductVatRate] = useState("10");
  const [addingProduct, setAddingProduct] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Add ingredient search/create
  const [ingSearch, setIngSearch] = useState("");
  const [ingUnit, setIngUnit] = useState("kg");
  const [ingCustomUnit, setIngCustomUnit] = useState("");
  const [addingIng, setAddingIng] = useState(false);

  // PDF parsing
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

  // ── Product management ────────────────────────────────────────

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
        ? product.recipeItems.map((ri) => ({
            ingredientId: ri.ingredientId,
            amount: ri.amount,
          }))
        : []
    );
  }

  // ── Ingredient management ─────────────────────────────────────

  // Existing ingredients not yet on this recipe
  const availableIngredients = ingredients.filter(
    (ing) => !recipeItems.some((ri) => ri.ingredientId === ing.id)
  );

  // Filtered by search query
  const searchTrimmed = ingSearch.trim().toLowerCase();
  const filteredIngredients = searchTrimmed
    ? availableIngredients.filter((ing) =>
        ing.name.toLowerCase().includes(searchTrimmed)
      )
    : availableIngredients;

  // Whether an exact-name match already exists anywhere (incl. already on recipe)
  const exactMatch = ingredients.find(
    (ing) => ing.name.toLowerCase() === searchTrimmed
  );
  const alreadyOnRecipe = exactMatch
    ? recipeItems.some((ri) => ri.ingredientId === exactMatch.id)
    : false;
  const showCreateOption =
    searchTrimmed.length > 0 && !exactMatch && !alreadyOnRecipe;

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

    // Final duplicate guard — re-check the live list
    const duplicate = ingredients.find(
      (ing) => ing.name.toLowerCase() === searchTrimmed
    );
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
    await fetchData(); // refresh ingredient list
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

  // ── Recipe save ───────────────────────────────────────────────

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

  // ── PDF parsing ───────────────────────────────────────────────

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
      const match = ingredients.find(
        (ing) => ing.name.toLowerCase() === p.name.toLowerCase()
      );
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
            i === index
              ? { status: "matched", ingredient: created, amount: result.amount }
              : r
          )
        : prev
    );
    setAddingUnmatchedIdx(null);
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recipes</h1>
          <Link
            href="/"
            className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-base sm:text-lg"
          >
            ← Orders
          </Link>
        </div>

        {/* Product selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Products
            </p>
            <button
              onClick={() => setShowAddProduct((v) => !v)}
              className="text-sm font-semibold text-blue-600 active:text-blue-800"
            >
              {showAddProduct ? "Cancel" : "+ Add product"}
            </button>
          </div>

          {showAddProduct && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Product name..."
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProduct()}
                className="flex-1 min-w-0 border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="w-24 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <select
                value={newProductVatRate}
                onChange={(e) => setNewProductVatRate(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="4">IVA 4%</option>
                <option value="10">IVA 10%</option>
                <option value="21">IVA 21%</option>
              </select>
              <button
                onClick={addProduct}
                disabled={addingProduct || !newProductName.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-50 active:bg-blue-700"
              >
                Add
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {products.length === 0 && (
              <p className="text-gray-400">No products yet. Add one above.</p>
            )}
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <button
                  onClick={() => selectProduct(p.id)}
                  className={`px-4 py-2 rounded-xl font-semibold text-base border transition-colors ${
                    selectedProductId === p.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 active:bg-gray-50"
                  }`}
                >
                  {p.name}
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="text-gray-300 hover:text-red-400 text-xl leading-none px-1"
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Import from PDF
              </p>
              <p className="text-sm text-gray-400 mb-3">
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
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-base disabled:opacity-50 active:bg-purple-700"
              >
                {parsing ? "Reading PDF…" : "Upload PDF"}
              </button>

              {parseError && (
                <p className="mt-3 text-sm text-red-500 font-medium">{parseError}</p>
              )}

              {parseResults && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Found {parseResults.length} ingredient{parseResults.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {parseResults.map((r, i) =>
                      r.status === "matched" ? (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-green-500 font-bold">✓</span>
                          <span className="font-medium text-gray-800">{r.ingredient.name}</span>
                          <span className="text-gray-400">{r.amount} {r.ingredient.unit}</span>
                        </li>
                      ) : (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-500 font-bold shrink-0">!</span>
                          <span className="font-medium text-gray-800 flex-1">{r.name}</span>
                          <span className="text-gray-400 shrink-0">{r.amount} {r.unit}</span>
                          <button
                            onClick={() => addUnmatchedIngredient(i)}
                            disabled={addingUnmatchedIdx === i}
                            className="shrink-0 px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 active:bg-yellow-600"
                          >
                            {addingUnmatchedIdx === i ? "Adding…" : "Add to inventory"}
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                  <div className="flex gap-3">
                    <button
                      onClick={applyParsedRecipe}
                      disabled={!parseResults.some((r) => r.status === "matched")}
                      className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:bg-green-700"
                    >
                      Apply matched
                    </button>
                    <button
                      onClick={() => setParseResults(null)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Price + VAT + Portions per unit */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 mb-4">
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Price <span className="font-normal text-gray-400">(IVA incl.)</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Selling price per portion</p>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => { setPrice(parseFloat(e.target.value) || 0); setSaved(false); }}
                  className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-base text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">IVA</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {price > 0
                      ? `Base: ${(price / (1 + vatRate / 100)).toFixed(2)} € + IVA: ${(price - price / (1 + vatRate / 100)).toFixed(2)} €`
                      : "Set a price to see the breakdown"}
                  </p>
                </div>
                <select
                  value={vatRate}
                  onChange={(e) => { setVatRate(parseFloat(e.target.value)); setSaved(false); }}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value={4}>4%</option>
                  <option value={10}>10%</option>
                  <option value={21}>21%</option>
                </select>
              </div>
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Portions per unit</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    How many portions does 1 unit yield? (e.g. 1 lasagna = 10 cuts)
                  </p>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={portionsPerUnit}
                  onChange={(e) => {
                    setPortionsPerUnit(Math.max(1, parseInt(e.target.value) || 1));
                    setSaved(false);
                  }}
                  className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-base text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Current recipe items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 mb-4">
              {recipeItems.length === 0 && (
                <p className="text-center py-8 text-gray-400">
                  No ingredients yet. Add one below.
                </p>
              )}
              {recipeItems.map((ri) => {
                const ing = ingredients.find((i) => i.id === ri.ingredientId);
                if (!ing) return null;
                return (
                  <div key={ri.ingredientId} className="flex items-center gap-2 sm:gap-4 px-4 sm:px-5 py-4">
                    <span className="flex-1 text-base sm:text-lg font-medium text-gray-800 min-w-0 truncate">
                      {ing.name}
                    </span>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={ri.amount}
                        onChange={(e) => updateAmount(ri.ingredientId, e.target.value)}
                        className="w-16 sm:w-24 border border-gray-300 rounded-xl px-2 sm:px-3 py-2 text-base sm:text-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <span className="text-gray-400 text-xs sm:text-sm w-6 sm:w-8">{ing.unit}</span>
                    </div>
                    <button
                      onClick={() => removeItem(ri.ingredientId)}
                      className="shrink-0 text-red-400 hover:text-red-600 text-2xl font-light leading-none"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add ingredient — search + create */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Add ingredient
              </p>

              <input
                type="text"
                placeholder="Search or type a new ingredient…"
                value={ingSearch}
                onChange={(e) => { setIngSearch(e.target.value); setSaved(false); }}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
              />

              {/* Existing matches */}
              {searchTrimmed && filteredIngredients.length > 0 && (
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-3">
                  {filteredIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => addIngredientToRecipe(ing.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="font-medium text-gray-800">{ing.name}</span>
                      <span className="text-sm text-gray-400">{ing.unit}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Already on recipe notice */}
              {exactMatch && alreadyOnRecipe && (
                <p className="text-sm text-gray-400 mb-3">
                  <span className="font-medium text-gray-600">{exactMatch.name}</span> is already in this recipe.
                </p>
              )}

              {/* Create new option */}
              {showCreateOption && (
                <div className="border border-dashed border-gray-300 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Create new ingredient: <span className="text-blue-600">{ingSearch.trim()}</span>
                  </p>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Unit</label>
                      <select
                        value={ingUnit}
                        onChange={(e) => setIngUnit(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        <option value="__custom__">Other…</option>
                      </select>
                    </div>
                    {ingUnit === "__custom__" && (
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">Custom unit</label>
                        <input
                          type="text"
                          value={ingCustomUnit}
                          onChange={(e) => setIngCustomUnit(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Starts with 0 stock — update in Inventory when needed.</p>
                  <button
                    onClick={createAndAddIngredient}
                    disabled={addingIng || (ingUnit === "__custom__" && !ingCustomUnit.trim())}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-50 active:bg-blue-700"
                  >
                    {addingIng ? "Adding…" : `Add "${ingSearch.trim()}"`}
                  </button>
                </div>
              )}

              {/* Pills for all available when no search */}
              {!searchTrimmed && availableIngredients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => addIngredientToRecipe(ing.id)}
                      className="px-4 py-2 rounded-xl font-semibold text-base bg-gray-100 text-gray-700 border border-gray-200 active:bg-gray-200"
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
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg sm:text-xl disabled:opacity-50 active:bg-blue-700"
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save Recipe"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
