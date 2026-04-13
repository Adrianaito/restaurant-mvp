# Restaurant MVP

A lightweight restaurant order and inventory management system built with Next.js 16, React 19, Prisma 7, and SQLite.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| ORM | Prisma 7 with `prisma-client` generator |
| Database | SQLite via `better-sqlite3` + `@prisma/adapter-better-sqlite3` |
| Language | TypeScript 5 |

> **Node version:** requires Node 20+. See `.nvmrc`.

---

## Getting Started

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Seed the database with sample data
npm run seed

# Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Data Model

```
Business
  ├── Product[]       — menu items (e.g. Lasagna, Coffee)
  ├── Ingredient[]    — raw stock items (e.g. Cheese, Milk)
  └── Order[]

Product
  ├── RecipeItem[]    — which ingredients and how much per unit
  └── OrderItem[]

Ingredient
  ├── stock: Float    — current quantity on hand
  ├── unit: String    — e.g. "kg", "L"
  └── RecipeItem[]

RecipeItem
  ├── productId
  ├── ingredientId
  └── amount: Float   — quantity of ingredient used per 1 unit of product

Order
  ├── label: String   — e.g. "Table 1", "Takeaway"
  ├── status: String  — "draft" | "confirmed"
  └── OrderItem[]

OrderItem
  ├── productId
  └── quantity: Int
```

All data is scoped to a single hardcoded business (`business-1`). Multi-tenancy is not implemented.

---

## Features

### Orders (`/`)

- List of all orders, newest first, with item count and status badge
- Create a new draft order with a label (table name, takeaway, etc.)
- Tap an order to open it

### Order Detail (`/orders/[id]`)

- View the current order summary (items + quantities)
- Add products via a full-screen product grid — tapping the same product again increments its quantity
- **Confirm Order** — deducts ingredients from inventory based on the product recipes and marks the order as confirmed
- Confirmed orders are read-only

### Inventory (`/inventory`)

- Lists all ingredients with current stock and unit
- Rows with stock at or below `1` are highlighted in red with a LOW STOCK warning

### Recipes (`/recipes`)

- Select a product to view and edit its recipe
- Add ingredients from the full ingredient list
- Set the amount per unit served for each ingredient
- Remove ingredients from the recipe
- Save — atomically replaces all recipe items for the product in a single transaction

---

## API Routes

All routes are under `app/api/` and use the Next.js App Router `route.ts` convention.

### Orders

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orders` | List all orders (with items and products) |
| `POST` | `/api/orders` | Create a draft order. Body: `{ label: string }` |
| `POST` | `/api/orders/[id]/add-item` | Add or increment a product on a draft order. Body: `{ productId: string, quantity?: number }` |
| `POST` | `/api/orders/[id]/confirm` | Confirm an order, deducting ingredient stock per recipe |

### Products

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | List all products |

### Ingredients

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ingredients` | List all ingredients with current stock |

### Recipes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/recipes` | List all products with their recipe items (ingredients + amounts) |
| `PUT` | `/api/recipes` | Replace all recipe items for a product. Body: `{ productId: string, items: { ingredientId: string, amount: number }[] }` |

---

## Project Structure

```
app/
  api/
    ingredients/route.ts
    orders/
      route.ts
      [id]/
        add-item/route.ts
        confirm/route.ts
    products/route.ts
    recipes/route.ts
  generated/prisma/     # auto-generated Prisma client
  inventory/page.tsx
  orders/[id]/page.tsx
  recipes/page.tsx
  layout.tsx
  page.tsx

components/
  InventoryList.tsx     # /inventory UI
  OrderDetail.tsx       # /orders/[id] UI
  OrderList.tsx         # / UI
  ProductGrid.tsx       # product picker used inside OrderDetail
  RecipeEditor.tsx      # /recipes UI

lib/
  prisma.ts             # singleton Prisma client with better-sqlite3 adapter

prisma/
  schema.prisma
  seed.ts
  dev.db                # SQLite database file (gitignored in production)
  migrations/
```

---

## Seed Data

Running `npm run seed` creates the following (safe to re-run — uses upsert):

**Ingredients:** Cheese (5 kg), Meat (3 kg), Milk (10 L)

**Products & Recipes:**
- Lasagna — 0.2 kg Cheese, 0.1 kg Meat
- Coffee — 0.1 L Milk
- Cake — (no recipe items seeded)

---

## Key Implementation Notes

- **Inventory deduction** happens at order confirmation (`POST /api/orders/[id]/confirm`). Each order item's quantity is multiplied by the recipe amounts to calculate the total deduction per ingredient.
- **Recipe saving** uses a Prisma `$transaction` that deletes all existing recipe items for the product and recreates them, ensuring no partial state.
- The Prisma client is a singleton stored on `globalThis` to survive hot reloads in development.
- `params` in dynamic route handlers is a `Promise` (Next.js 15+ breaking change) and must be awaited before use.
