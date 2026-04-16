"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ingredient = {
  id: string;
  name: string;
  stock: number;
  unit: string;
};

const LOW_STOCK_THRESHOLD = 1;

export default function InventoryList() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then(setIngredients);
  }, []);

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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {ingredients.length === 0 && (
            <p className="text-center py-10 text-gray-400">No ingredients found.</p>
          )}
          {ingredients.map((ing) => {
            const isLow = ing.stock <= LOW_STOCK_THRESHOLD;
            return (
              <div
                key={ing.id}
                className={`flex items-center justify-between px-4 sm:px-5 py-4 ${
                  isLow ? "bg-red-50" : ""
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {isLow && (
                    <span className="text-red-500 text-lg shrink-0" title="Low stock">
                      ⚠
                    </span>
                  )}
                  <span className={`text-lg sm:text-xl font-medium truncate ${isLow ? "text-red-700" : "text-gray-800"}`}>
                    {ing.name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-xl sm:text-2xl font-bold ${
                      isLow ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {ing.stock.toFixed(1)}
                  </span>
                  <span className="text-gray-400 text-sm ml-1">{ing.unit}</span>
                  {isLow && (
                    <p className="text-red-500 text-xs font-semibold mt-0.5">LOW STOCK</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
