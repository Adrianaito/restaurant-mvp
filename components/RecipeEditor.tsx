"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Ingredient = { id: string; name: string; unit: string };
type RecipeItem = { ingredientId: string; amount: number };
type Product = {
  id: string;
  name: string;
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

export default function RecipeEditor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New product form
  const [newProductName, setNewProductName] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // PDF parsing
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResults, setParseResults] = useState<MatchResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

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
      body: JSON.stringify({ name: newProductName.trim() }),
    });
    setNewProductName("");
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
    const product = products.find((p) => p.id === productId);
    setRecipeItems(
      product
        ? product.recipeItems.map((ri) => ({
            ingredientId: ri.ingredientId,
            amount: ri.amount,
          }))
        : []
    );
  }

  function addIngredient(ingredientId: string) {
    if (recipeItems.some((ri) => ri.ingredientId === ingredientId)) return;
    setRecipeItems((prev) => [...prev, { ingredientId, amount: 1 }]);
    setSaved(false);
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
    await fetch("/api/recipes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProductId, items: recipeItems }),
    });
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
      // Reset the file input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const parsed: ParsedIngredient[] = data.ingredients ?? [];

    // Match each parsed ingredient against existing ingredients by name
    const results: MatchResult[] = parsed.map((p) => {
      const match = ingredients.find(
        (ing) => ing.name.toLowerCase() === p.name.toLowerCase()
      );
      if (match) {
        return { status: "matched", ingredient: match, amount: p.amount };
      }
      return { status: "unmatched", name: p.name, amount: p.amount, unit: p.unit };
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
    // Merge with existing items — don't remove anything already there
    setRecipeItems((prev) => {
      const next = [...prev];
      for (const m of matched) {
        const existing = next.findIndex((ri) => ri.ingredientId === m.ingredient.id);
        if (existing >= 0) {
          next[existing] = { ...next[existing], amount: m.amount };
        } else {
          next.push({ ingredientId: m.ingredient.id, amount: m.amount });
        }
      }
      return next;
    });
    setSaved(false);
    setParseResults(null);
  }

  const availableToAdd = ingredients.filter(
    (ing) => !recipeItems.some((ri) => ri.ingredientId === ing.id)
  );

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
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Product name..."
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProduct()}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
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
            {/* PDF upload */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Import from PDF
                </p>
              </div>
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

              {/* Parse error */}
              {parseError && (
                <p className="mt-3 text-sm text-red-500 font-medium">{parseError}</p>
              )}

              {/* Parse results preview */}
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
                          <span className="text-gray-400">
                            {r.amount} {r.ingredient.unit}
                          </span>
                        </li>
                      ) : (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-500 font-bold">!</span>
                          <span className="font-medium text-gray-500 line-through">{r.name}</span>
                          <span className="text-xs text-yellow-600 font-medium">
                            not in your ingredients
                          </span>
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
                      Apply matched ingredients
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

            {/* Current recipe items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 mb-4">
              {recipeItems.length === 0 && (
                <p className="text-center py-8 text-gray-400">
                  No ingredients yet. Upload a PDF or add one below.
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

            {/* Add ingredient */}
            {availableToAdd.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Add ingredient
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableToAdd.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => addIngredient(ing.id)}
                      className="px-4 py-2 rounded-xl font-semibold text-base bg-gray-100 text-gray-700 border border-gray-200 active:bg-gray-200"
                    >
                      + {ing.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
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
