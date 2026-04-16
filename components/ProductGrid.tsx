"use client";

type Product = { id: string; name: string };

type Props = {
  products: Product[];
  onAdd: (productId: string) => void;
  disabled?: boolean;
};

const COLORS = [
  "bg-blue-500 active:bg-blue-600",
  "bg-indigo-500 active:bg-indigo-600",
  "bg-violet-500 active:bg-violet-600",
  "bg-emerald-500 active:bg-emerald-600",
  "bg-amber-500 active:bg-amber-600",
  "bg-rose-500 active:bg-rose-600",
];

export default function ProductGrid({ products, onAdd, disabled }: Props) {
  return (
    <div>
      <h2 className="text-base sm:text-lg font-semibold text-gray-600 mb-3 uppercase tracking-wide">
        Add Items
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map((product, i) => (
          <button
            key={product.id}
            onClick={() => onAdd(product.id)}
            disabled={disabled}
            className={`${COLORS[i % COLORS.length]} text-white rounded-2xl py-5 sm:py-6 px-3 sm:px-4 text-lg sm:text-xl font-bold shadow-sm disabled:opacity-50 transition-transform active:scale-95`}
          >
            {product.name}
          </button>
        ))}
      </div>
    </div>
  );
}
