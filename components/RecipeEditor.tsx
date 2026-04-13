"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
};

type RecipeItem = {
  ingredientId: string;
  amount: number;
};

type Product = {
  id: string;
  name: string;
  recipeItems: {
    ingredientId: string;
    amount: number;
    ingredient: { id: string; name: string; unit: string };
  }[];
};

export default function RecipeEditor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then((r) => r.json()),
      fetch("/api/ingredients").then((r) => r.json()),
    ]).then(([prods, ings]) => {
      setProducts(prods);
      setIngredients(ings);
    });
  }, []);

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setSaved(false);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setRecipeItems(
        product.recipeItems.map((ri) => ({
          ingredientId: ri.ingredientId,
          amount: ri.amount,
        }))
      );
    } else {
      setRecipeItems([]);
    }
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
    // Update local product cache so switching back reflects saved state
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
  }

  const availableToAdd = ingredients.filter(
    (ing) => !recipeItems.some((ri) => ri.ingredientId === ing.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
          <Link
            href="/"
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg"
          >
            ← Orders
          </Link>
        </div>

        {/* Product selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Select product
          </p>
          <div className="flex flex-wrap gap-2">
            {products.length === 0 && (
              <p className="text-gray-400">No products found.</p>
            )}
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p.id)}
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
        </div>

        {selectedProductId && (
          <>
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
                  <div key={ri.ingredientId} className="flex items-center gap-4 px-5 py-4">
                    <span className="flex-1 text-lg font-medium text-gray-800">
                      {ing.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={ri.amount}
                        onChange={(e) => updateAmount(ri.ingredientId, e.target.value)}
                        className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <span className="text-gray-400 text-sm w-8">{ing.unit}</span>
                    </div>
                    <button
                      onClick={() => removeItem(ri.ingredientId)}
                      className="text-red-400 hover:text-red-600 text-2xl font-light leading-none"
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
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
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-xl disabled:opacity-50 active:bg-blue-700"
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save Recipe"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
