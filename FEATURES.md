# Restaurant MVP — Feature Documentation

## Overview

A mobile-first restaurant operations tool for managing tables, orders, inventory, and production. Built with Next.js 15 App Router, Prisma 7 + SQLite, and Tailwind CSS.

---

## Navigation

The settings menu (⚙, top-right of the main screen) links to all sections:

| Route | Section |
|---|---|
| `/` | Tables (main dashboard) |
| `/orders/[id]` | Order detail |
| `/inventory` | Stock management |
| `/recipes` | Product & recipe editor |
| `/production` | Batch production log |
| `/tables` | Table configuration |

---

## Tables

**Route:** `/` · **Component:** `OrderList`

The main screen shows every configured table as a card. Tables are colour-coded by their current status:

- **White** — free, no active order
- **Yellow** — occupied, order is a draft (not yet confirmed)
- **Green** — occupied, order is confirmed

Tapping a free table creates a new draft order and opens it immediately. Tapping an occupied table reopens the existing order. Below the table grid, a **"Closed today"** list shows all orders paid since midnight.

Tables are configured in **Settings → Tables** (add by name, delete with ×).

---

## Orders

**Route:** `/orders/[id]` · **Component:** `OrderDetail`

### Lifecycle

Orders follow a strict status flow:

```
draft → confirmed → paid
              ↓
          cancelled
```

**Draft** — the waiter is building the order. No inventory is touched yet. Items can be freely added, removed, or adjusted.

**Confirmed** — the kitchen has been notified. Inventory is deducted at this point (see Inventory below). The order is locked for free edits; any change triggers the re-confirm flow.

**Paid** — the table has been settled. `paidAt` is stamped. The order is read-only and the table is freed.

**Cancelled** — aborted at any stage. If the order was confirmed, inventory is returned automatically.

### Adding items

Below the order summary, a **ProductGrid** shows all products as coloured buttons. Tapping one adds 1 unit to the order (or increments quantity if already present).

### Adjusting quantities

Each line item has **−** and **+** controls:

- On a **draft** order — **+** and **−** adjust freely. At quantity 1, **−** opens the removal modal.
- On a **confirmed** order — pressing **−** at any quantity opens the removal modal (inventory must be accounted for). Pressing **+** returns all inventory and reverts the order to draft so it must be re-confirmed.

### Removing items

The **✕** button and **−** (at quantity 1) both open a removal modal. The modal content depends on order status:

- **Draft** — simple "Remove / Keep it" prompt. No inventory impact.
- **Confirmed** — three reason options:
  - **Return to inventory** — the item's stock is restored.
  - **Defect / Waste** — item is removed, stock is *not* restored (it was wasted).
  - **Complimentary** — item is removed, stock is *not* restored (given free to the client).

For partial decrements (confirmed order, quantity > 1), only 1 unit is affected per action.

All removals are logged in the edit history with their reason.

### Re-confirm flow

If a waiter adds an item or presses **+** on a confirmed order, the system:
1. Returns all inventory for the order's current items.
2. Reverts the order to **draft**.
3. Shows the **Confirm** button again.

This ensures the kitchen always sees a complete, approved order before inventory is finally deducted.

### Confirm & Pay

- **Confirm** button — validates inventory for every item, deducts stock, and moves the order to "confirmed". Disabled if the order has no items or if any product is out of stock (an error banner explains the shortfall).
- **Pay & Close** button — marks the order as paid, stamps `paidAt`, and returns to the table dashboard.
- **Cancel** button — prompts a confirmation modal. Cancelling a confirmed order returns its inventory automatically.

### Edit history

Every change (add, remove, quantity update, removal reason) is logged with a timestamp. The **Edit History** panel at the bottom of the order is collapsible and shows the full audit trail for that sitting.

---

## Inventory

**Route:** `/inventory` · **Component:** `InventoryList`

The inventory screen has two sections.

### Batch stock

Shows the available portions for each product that has been produced in batches. For each product:

- **Available portions** = total portions made − portions sold (across all production runs)
- Colour coding: 🔴 out of stock · 🟡 at or below threshold · 🟢 ok
- The **"Warn below"** threshold is editable inline per product.

### Ingredients

Lists every raw ingredient with its current stock level:

- **Add ingredient** — expandable form at the top. Fields: name, initial stock, unit (common dropdown + "Other…" for custom), warn below threshold.
- **Edit** — per-row edit mode lets you update stock, unit, and threshold inline.
- **Delete** — removes the ingredient (⚠ this also breaks any recipes that use it).
- Low-stock warning (⚠) appears when `stock ≤ lowStockThreshold`.

---

## Production (Batch)

**Route:** `/production` · **Component:** `ProductionLog`

Used when a product is prepared in bulk ahead of orders — e.g. making a tray of lasagna that yields 10 portions.

### Logging a batch

1. Select a product.
2. Enter the number of **units** produced (e.g. 2 trays).
3. The screen shows `units × portionsPerUnit = total portions` and a live ingredient check:
   - Each required ingredient is shown with the amount needed vs. available stock.
   - Rows go red if stock is insufficient. The **Log production** button is disabled until all ingredients are covered.
4. On confirm: raw ingredient stock is deducted and a Production record is created.

### Production history

Below the form, every past batch is listed with:
- Product name and timestamp
- Portions made / sold / **remaining**
- Remaining portions are colour-coded: grey (0) · red (1–2) · green (3+)

### How batch stock flows into orders

When an order for a batch product is confirmed, the system increments `soldCount` on the most recent Production record (instead of deducting raw ingredients). This means the portions screen always reflects real remaining inventory.

---

## Recipes

**Route:** `/recipes` · **Component:** `RecipeEditor`

Manages products and their ingredient compositions.

### Products

- **Add product** — enter a name. Products are the items that appear in the order grid.
- **Delete product** — removes it from the product list (× next to the name).

### Recipe composition

Selecting a product opens its recipe editor:

- **Portions per unit** — how many portions does one unit of this product yield? Default is 1. Set to 10 for a lasagna tray that serves 10, for example. This value is used by the Production log.
- **Ingredient list** — shows each ingredient with an editable amount field. Remove with ×.
- **Add ingredient** — search field filters existing ingredients by name. If no match, an option appears to create a new ingredient inline (with unit selection). Newly created ingredients start with 0 stock.
- **Save Recipe** — commits all changes. Completely replaces the previous recipe for that product.

### PDF import

Upload a recipe PDF and Claude (AI) will extract the ingredient list automatically:

- **Matched** (✓ green) — ingredient name found in inventory; amount is pre-filled.
- **Unmatched** (! yellow) — ingredient not yet in inventory; an **"Add to inventory"** button creates it (0 stock, unit from PDF).
- **Apply matched** — copies all matched ingredients into the recipe editor in one click.
- Unmatched ingredients must be added individually and may need amounts corrected.

---

## Data Model Summary

| Model | Key fields |
|---|---|
| `Business` | id, name, logRetentionDays |
| `Table` | id, name, businessId |
| `Product` | id, name, portionsPerUnit, lowPortionsThreshold, businessId |
| `Ingredient` | id, name, stock, unit, lowStockThreshold, businessId |
| `RecipeItem` | productId, ingredientId, amount |
| `Order` | id, label, status, createdAt, paidAt, businessId |
| `OrderItem` | orderId, productId, quantity |
| `OrderEditLog` | orderId, action, productName, quantityBefore, quantityAfter, createdAt |
| `Production` | productId, portionsMade, soldCount, createdAt, businessId |

---

## Inventory Logic

The `adjustInventory(productId, quantity)` helper centralises all stock changes:

- **Positive quantity** = deduct (consume).
- **Negative quantity** = return (restore).

It checks whether the product has a recent Production batch. If yes, it adjusts `soldCount` on that batch. If no batch exists, it deducts directly from raw ingredient stock using the product's recipe.

This means a product can be sold either from pre-made batches or made-to-order from ingredients — the same order flow works for both.

---

## Audit Trail

Every item change on an order is recorded in `OrderEditLog` with the following actions:

| Action | Meaning |
|---|---|
| `add` | Product added to order |
| `remove` | Product removed (draft order, no reason needed) |
| `update_quantity` | Quantity changed |
| `remove_return` | Removed from confirmed order — stock restored |
| `remove_defect` | Removed from confirmed order — counted as waste |
| `remove_comp` | Removed from confirmed order — complimentary |

The Edit History panel in OrderDetail displays these in chronological order.

---

## Log Retention

Edit logs are kept for a configurable number of days per business, then automatically deleted. Only logs for **closed orders** (paid or cancelled) are eligible for deletion — active order logs are never touched.

### Retention settings (future billing tiers)

| Plan | `logRetentionDays` |
|---|---|
| Starter | 30 |
| Pro | 90 |
| Business | 365 |
| Enterprise | `null` (permanent) |

`logRetentionDays` is stored on the `Business` model. Setting it to `null` disables pruning entirely.

### Cleanup job

**Endpoint:** `POST /api/cleanup/logs`

Protected by a `Bearer` token (`CLEANUP_SECRET` environment variable). Intended to be called by a scheduled cron job (e.g. Vercel Cron, cron-job.org) once daily:

```
POST https://yourdomain.com/api/cleanup/logs
Authorization: Bearer <CLEANUP_SECRET>
```

Returns `{ deleted: N }` with the total number of log entries removed across all businesses.

**Important:** upgrading a business to a longer retention plan does not retroactively delete logs that were already kept. The cleanup job only prunes logs older than the current window from that point forward.
