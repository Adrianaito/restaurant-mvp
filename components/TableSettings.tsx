"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Table = { id: string; name: string };

export default function TableSettings() {
  const [tables, setTables] = useState<Table[]>([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function fetchTables() {
    const res = await fetch("/api/tables");
    setTables(await res.json());
  }

  useEffect(() => { fetchTables(); }, []);

  async function addTable() {
    if (!name.trim()) return;
    setAdding(true);
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    setAdding(false);
    fetchTables();
  }

  async function deleteTable(id: string) {
    await fetch("/api/tables", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchTables();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tables</h1>
          <Link
            href="/"
            className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-base sm:text-lg"
          >
            ← Orders
          </Link>
        </div>

        {/* Add table */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 mb-4 sm:mb-6">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Add table
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. Table 1, Bar, Terrace..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTable()}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={addTable}
              disabled={adding || !name.trim()}
              className="px-5 sm:px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-base sm:text-lg disabled:opacity-50 active:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Table list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {tables.length === 0 && (
            <p className="text-center py-10 text-gray-400">
              No tables yet. Add one above.
            </p>
          )}
          {tables.map((table) => (
            <div
              key={table.id}
              className="flex items-center justify-between px-4 sm:px-5 py-4"
            >
              <span className="text-lg sm:text-xl font-medium text-gray-800">{table.name}</span>
              <button
                onClick={() => deleteTable(table.id)}
                className="text-red-400 hover:text-red-600 text-2xl font-light leading-none"
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
