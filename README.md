# Restaurant MVP

A multi-tenant-ready SaaS for restaurant kitchen management, built end to end as an independent project — order lifecycle, inventory, AI-assisted recipe/PDF parsing, batch production, sales dashboards with Spanish VAT (IVA) breakdown, and full audit logging.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI | React, Tailwind CSS |
| ORM | Prisma with `better-sqlite3` adapter |
| Database | SQLite |
| AI | Anthropic Claude — PDF parsing for recipe import |
| Language | TypeScript |

> **Node version:** requires Node 20+. See `.nvmrc`.

See [FEATURES.md](./FEATURES.md) for the complete feature and API reference.

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
Business (tenant record)
  ├── Table[]          — physical tables/zones
  ├── Product[]        — menu items (price, IVA rate, portions per unit)
  ├── Ingredient[]      — raw stock items
  ├── Order[]           — table bills
  └── Production[]      — batch production runs

Product
  ├── RecipeItem[]     — which ingredients and how much per unit
  └── OrderItem[]

Ingredient
  ├── stock: Float
  ├── unit: String
  └── RecipeItem[]

Order
  ├── tableId
  ├── status: String   — draft | confirmed | paid
  └── OrderItem[]

Production
  ├── productId
  ├── portionsMade: Int
  └── soldCount: Int
```

**Multi-tenancy:** the data model is fully multi-tenant — every entity carries a `businessId` foreign key. Routes currently resolve a hardcoded `business-1` rather than an authenticated tenant; wiring up auth (e.g. Clerk) to replace that constant is the one remaining step before onboarding multiple real businesses. See [FEATURES.md § Multi-Tenancy Notes](./FEATURES.md#12-multi-tenancy-notes).

---

## Features

- **Table management** — track physical tables/zones per business.
- **Order lifecycle** — draft → confirm → paid, with automatic ingredient stock deduction on confirmation.
- **Inventory** — live stock levels per ingredient with low-stock warnings.
- **Recipe editor** — manual editing, plus AI-powered PDF import: upload a recipe PDF and Claude extracts a structured ingredient list automatically.
- **Batch production** — log production runs per product (portions made vs. sold) to track yield.
- **Dashboard** — sales summaries with a Spanish VAT (IVA) breakdown by rate (4% / 10% / 21%), computed from paid orders.
- **Audit logs** — edit history with configurable per-business retention and automatic cleanup.

---

## API Routes

All routes are under `app/api/` and use the Next.js App Router `route.ts` convention. Full reference in [FEATURES.md § API Reference](./FEATURES.md#11-api-reference).

| Area | Routes |
|---|---|
| Orders | `GET/POST /api/orders`, `POST /api/orders/[id]/add-item`, `POST /api/orders/[id]/confirm` |
| Products | `GET /api/products` |
| Ingredients | `GET /api/ingredients` |
| Recipes | `GET/PUT /api/recipes`, `POST /api/recipes/parse` (AI PDF import) |
| Tables | `GET/POST /api/tables` |
| Production | `GET/POST /api/productions` |
| Dashboard | `GET /api/dashboard` — VAT/IVA breakdown and sales summary |

---

## Project Structure

```
app/
  api/            # route.ts handlers — orders, products, ingredients, recipes, tables, productions, dashboard
  dashboard/      # sales + VAT dashboard UI
  orders/[id]/    # order detail UI
  production/     # batch production UI
  tables/         # table management UI
  generated/prisma/

components/
lib/
  prisma.ts       # singleton Prisma client

prisma/
  schema.prisma
  seed.ts
  migrations/
```

---

## Seed Data

Running `npm run seed` creates sample ingredients, products, and recipes (safe to re-run — uses upsert).

---

## Key Implementation Notes

- **Inventory deduction** happens at order confirmation. Each order item's quantity is multiplied by the recipe amounts to calculate the total deduction per ingredient.
- **Recipe saving** uses a Prisma transaction that replaces all recipe items for a product atomically.
- **VAT/IVA breakdown** is computed per order line from each product's `vatRate`, then aggregated by rate for the dashboard.
- The Prisma client is a singleton stored on `globalThis` to survive hot reloads in development.
- `params` in dynamic route handlers is a `Promise` and must be awaited before use.
