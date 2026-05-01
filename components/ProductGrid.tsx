"use client";

type Product = { id: string; name: string };

type Props = {
  products: Product[];
  onAdd: (productId: string) => void;
  disabled?: boolean;
};

const COLORS = [
  "bg-indigo-500 active:bg-indigo-600",
  "bg-violet-500 active:bg-violet-600",
  "bg-sky-500 active:bg-sky-600",
  "bg-emerald-500 active:bg-emerald-600",
  "bg-amber-500 active:bg-amber-600",
  "bg-rose-500 active:bg-rose-600",
];

export default function ProductGrid({ products, onAdd, disabled }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Add items
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {products.map((product, i) => (
          <button
            key={product.id}
            onClick={() => onAdd(product.id)}
            disabled={disabled}
            className={`${COLORS[i % COLORS.length]} text-white rounded-xl py-4 sm:py-5 px-3 text-sm sm:text-base font-semibold shadow-sm disabled:opacity-40 active:scale-95 transition-transform`}
          >
            {product.name}
          </button>
        ))}
      </div>
    </div>
  );
}
