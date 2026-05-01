"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Table = { id: string; name: string };

export default function TableSettings() {
  const router = useRouter();
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
          <h1 className="text-lg font-semibold text-slate-900">Tables</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Add table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Add table</p>
          <div className="flex gap-2.5">
            <input
              type="text"
              placeholder="e.g. Table 1, Bar, Terrace…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTable()}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addTable}
              disabled={adding || !name.trim()}
              className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg disabled:opacity-50 active:bg-indigo-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Table list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {tables.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No tables yet. Add one above.</p>
          )}
          <div className="divide-y divide-slate-100">
            {tables.map((table) => (
              <div key={table.id} className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm font-medium text-slate-800">{table.name}</span>
                <button
                  onClick={() => deleteTable(table.id)}
                  className="text-slate-300 hover:text-red-400 text-xl font-light leading-none transition-colors"
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
