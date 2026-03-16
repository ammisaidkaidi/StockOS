# StockOS — Vue 3 ERP

A professional ERP Inventory Manager built with **Vue 3 + Pinia + Vue Router + Vite + Tailwind CSS**.  
All data is persisted in `localStorage`. No backend required.

---

## Tech Stack

| Layer       | Technology                         |
|-------------|-------------------------------------|
| Framework   | Vue 3 (Composition API, `<script setup>`) |
| State       | Pinia 2                             |
| Routing     | Vue Router 4 (hash history)         |
| Styling     | Tailwind CSS 3 + custom CSS vars    |
| Build       | Vite 5                              |
| Persistence | `localStorage`                      |

---

## Project Structure

```
src/
├── main.js                   # App entry — createApp + pinia + router
├── App.vue                   # Root layout + keyboard shortcuts + FAB
├── assets/
│   └── styles.css            # Design tokens, global component classes
├── router/
│   └── index.js              # All routes (lazy-loaded views)
├── stores/
│   ├── db.js                 # All data + CRUD + seed + export (Pinia)
│   ├── modal.js              # Modal open/close/editData state
│   └── settings.js           # User preferences (searchMode)
├── composables/
│   ├── useSort.js            # Reusable sort key + direction
│   ├── usePagination.js      # Page / totalPages / paginated slice
│   └── useClickOutside.js    # Closes dropdowns on outside click
├── utils/
│   ├── helpers.js            # uuid, now, fmtNum, fmtDate, seq generators
│   └── search.js             # fuzzy / contains / startsWith algorithms
├── components/
│   ├── AppSidebar.vue        # Navigation sidebar with badges + chips
│   ├── AppTopbar.vue         # Top bar with route title + date
│   ├── SidebarIcon.vue       # SVG icon map component
│   ├── SearchableSelect.vue  # Reusable searchable dropdown (all modals)
│   ├── StatCard.vue          # KPI card shell
│   ├── StockBar.vue          # Horizontal progress bar
│   └── modals/
│       ├── ModalManager.vue  # Dynamic modal router via defineAsyncComponent
│       ├── ModalShell.vue    # Shared modal chrome (header, footer, sizes)
│       ├── ProductModal.vue
│       ├── ClientModal.vue
│       ├── SupplierModal.vue
│       ├── SalesOrderModal.vue
│       ├── PurchaseOrderModal.vue
│       ├── AdjustModal.vue
│       ├── CategoryModal.vue
│       └── SettingsModal.vue
└── views/
    ├── DashboardView.vue
    ├── ClientsView.vue
    ├── SalesOrdersView.vue
    ├── ProductsView.vue
    ├── CategoriesView.vue
    ├── MovementsView.vue
    ├── PurchaseOrdersView.vue
    ├── SuppliersView.vue
    ├── AlertsView.vue
    └── AnalyticsView.vue
```

---

## Getting Started

```bash
cd stockos-vue
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

To build for production:
```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

---

## Features

### Sales
- **Clients** — full CRUD, status filter, click-through to related orders
- **Sales Orders** — line-item orders with auto-price fill, tax %, stock warnings, Ship + Deliver workflow

### Inventory
- **Products** — sortable table, category/stock filters, pagination, stock level bars
- **Categories** — manage product categories
- **Stock Movements** — full ledger of every in/out/adjustment with before/after quantities

### Procurement
- **Purchase Orders** — multi-line POs, one-click Receive (auto-stocks all lines)
- **Suppliers** — card layout with linked product and PO counts

### Intelligence
- **Alerts** — flags every low-stock and out-of-stock product with quick Restock action
- **Analytics** — movement breakdown, sales performance, inventory health + margin, top clients, most-moved products

### UX
- **SearchableSelect** — every dropdown is searchable with configurable algorithm
- **Search Modes** — `contains` · `fuzzy` · `startsWith`, switchable in Settings, persisted in `localStorage`
- **Keyboard shortcuts** — `N` opens the contextual new-record modal for the current page, `Esc` closes any modal
- **FAB** — floating `+` button maps to the correct modal per page
- **CSV / JSON export** per table via the Pinia store

---

## SearchableSelect

Reusable `<SearchableSelect>` component used in every modal form field that references another entity.

```vue
<SearchableSelect
  :options="productOptions"       <!-- [{ value, label, sub? }] -->
  v-model="form.product_id"
  placeholder="Select product…"
  :search-mode="settings.searchMode"  <!-- 'contains' | 'fuzzy' | 'startswith' -->
  clearable
  @update:modelValue="onProductChange"
/>
```

Supports keyboard navigation (↑ ↓ Enter Esc) and highlights matched characters in results.
