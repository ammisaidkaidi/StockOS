import { createRouter, createWebHashHistory } from 'vue-router'

const r = (path, file, title) => ({ path, component: () => import(`@/views/${file}.vue`), meta: { title } })

const routes = [
  { path: '/', redirect: '/dashboard' },
  r('/dashboard',        'DashboardView',        'Dashboard'),
  r('/clients',          'ClientsView',           'Clients'),
  r('/end-customers',    'EndCustomersView',       'End Customers'),
  r('/sales-orders',     'SalesOrdersView',        'Sales Orders'),
  r('/s-payments',       'SPaymentsView',          'Sales Payments'),
  r('/products',         'ProductsView',           'Products'),
  r('/categories',       'CategoriesView',         'Categories'),
  r('/movements',        'MovementsView',          'Stock Movements'),
  r('/purchase-orders',  'PurchaseOrdersView',     'Purchase Orders'),
  r('/p-payments',       'PPaymentsView',          'Purchase Payments'),
  r('/suppliers',        'SuppliersView',          'Suppliers'),
  r('/alerts',           'AlertsView',             'Stock Alerts'),
  r('/analytics',        'AnalyticsView',          'Analytics'),
  r('/reports/client-situation', 'ClientSituationView', 'Client Situation'),
]

export default createRouter({ history: createWebHashHistory(), routes })
