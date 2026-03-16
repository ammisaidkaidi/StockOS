<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDbStore } from '@/stores/db'
import { useModalStore } from '@/stores/modal'
import { useTableSearch } from '@/composables/useTableSearch'
import { useSettingsStore } from '@/stores/settings'
import SearchableSelect from '@/components/SearchableSelect.vue'
import { fmtNum, fmtDate } from '@/utils/helpers'
import { exportCSV, exportJSON, exportExcel, exportHTML, shareWhatsApp, shareEmail, orderSummaryText } from '@/utils/export'

const db = useDbStore(), modal = useModalStore(), settings = useSettingsStore(), route = useRoute()
const search = ref(''), statusFilter = ref(''), clientFilter = ref('')
onMounted(() => { if (route.query.client) clientFilter.value = route.query.client })

const soBadge = s=>({draft:'b-gray',confirmed:'b-blue',processing:'b-cyan',shipped:'b-purple',delivered:'b-green',cancelled:'b-red'}[s]||'b-gray')

const clientOptions = computed(() => [
  { value:'', label:'All Clients' },
  ...db.clients.map(c=>({value:c.id,label:c.full_name,sub:c.phone||''}))
])

const allRows = computed(() => [...db.salesOrders].reverse())
const textFiltered = useTableSearch(allRows, [
  'so_number','notes','status',
  r => db.getClient(r.client_id)?.full_name||'',
  r => db.getEndCustomer(r.end_customer_id)?.full_name||''
], search)
const filtered = computed(() => {
  let rows = textFiltered.value
  if (statusFilter.value) rows = rows.filter(o=>o.status===statusFilter.value)
  if (clientFilter.value) rows = rows.filter(o=>o.client_id===clientFilter.value)
  return rows
})
const filteredRevenue = computed(() =>
  filtered.value.filter(o=>['shipped','delivered'].includes(o.status)).reduce((s,o)=>s+(o.total||0),0))

function paymentBadge(soId, total) {
  const paid = db.soPaymentTotal(soId)
  if (!total) return null
  if (paid >= total) return { label:'Paid', cls:'b-green' }
  if (paid > 0)      return { label:'Partial', cls:'b-yellow' }
  return { label:'Unpaid', cls:'b-red' }
}
function tryDelete(id) { try { db.deleteSO(id) } catch(e) { alert(e.message) } }
function confirmFulfill(id) {
  const so = db.salesOrders.find(o=>o.id===id); if (!so) return
  const low = (so.lines||[]).filter(l=>{ const p=db.getProduct(l.product_id); return p&&l.qty>p.stock })
  const msg = low.length ? `⚠ Low stock: ${low.map(l=>db.getProduct(l.product_id)?.name).join(', ')}\nFulfill anyway?` : `Ship ${so.so_number}?`
  if (!confirm(msg)) return
  db.fulfillSO(id)
}
// Export helpers
function doExport(fmt) {
  const rows = filtered.value
  if (fmt==='csv')   exportCSV(rows, 'sales-orders.csv')
  if (fmt==='json')  exportJSON(rows, 'sales-orders.json')
  if (fmt==='xlsx')  exportExcel(rows, 'sales-orders.xlsx', 'Sales Orders')
  if (fmt==='html')  exportHTML(rows, 'sales-orders.html', 'Sales Orders')
}
function shareOrder(so, channel) {
  const text = orderSummaryText(so, db.getClient, db.getProduct)
  if (channel==='wa')    shareWhatsApp(text)
  if (channel==='email') shareEmail(`Order ${so.so_number}`, text)
}
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <input class="input" style="width:190px" :placeholder="`Search (${settings.searchMode})…`" v-model="search"/>
        <select class="input" style="width:145px" v-model="statusFilter">
          <option value="">All Status</option>
          <option v-for="s in ['draft','confirmed','processing','shipped','delivered','cancelled']" :key="s">{{ s }}</option>
        </select>
        <div style="width:195px"><SearchableSelect :options="clientOptions" v-model="clientFilter" :search-mode="settings.searchMode"/></div>
      </div>
      <div class="flex gap-2">
        <div class="flex gap-1">
          <button class="btn btn-ghost btn-sm" @click="doExport('csv')">CSV</button>
          <button class="btn btn-ghost btn-sm" @click="doExport('json')">JSON</button>
          <button class="btn btn-ghost btn-sm" @click="doExport('xlsx')">Excel</button>
          <button class="btn btn-ghost btn-sm" @click="doExport('html')">HTML</button>
        </div>
        <button class="btn btn-primary" @click="modal.open('so')">+ New Order</button>
      </div>
    </div>

    <div class="card p-0 overflow-hidden">
      <div class="tbl-wrap">
        <table>
          <thead><tr>
            <th>SO#</th><th>Client</th><th>End Customer</th><th>Lines</th>
            <th>Total</th><th>Paid</th><th>Delivery</th><th>Status</th><th>Payment</th><th>Actions</th>
          </tr></thead>
          <tbody>
            <tr v-if="!filtered.length"><td colspan="10" style="text-align:center;color:var(--text3);padding:32px">No orders. <span style="color:var(--accent);cursor:pointer" @click="modal.open('so')">Create one</span></td></tr>
            <tr v-for="so in filtered" :key="so.id">
              <td class="font-mono" style="color:var(--accent)">{{ so.so_number }}</td>
              <td style="font-weight:500">{{ db.getClient(so.client_id)?.full_name||'—' }}</td>
              <td style="color:var(--text2)">{{ db.getEndCustomer(so.end_customer_id)?.full_name||'—' }}</td>
              <td class="font-mono">{{ so.lines?.length||0 }}</td>
              <td class="font-mono font-bold" style="color:var(--accent3)">{{ fmtNum(so.total||0) }} DZD</td>
              <td class="font-mono" style="color:var(--accent3)">{{ fmtNum(db.soPaymentTotal(so.id)) }} DZD</td>
              <td style="color:var(--text2)">{{ so.delivery_date||'—' }}</td>
              <td><span class="badge" :class="soBadge(so.status)">{{ so.status }}</span></td>
              <td>
                <span v-if="paymentBadge(so.id, so.total)" class="badge" :class="paymentBadge(so.id,so.total).cls">
                  {{ paymentBadge(so.id,so.total).label }}
                </span>
              </td>
              <td>
                <div class="flex gap-1 flex-wrap">
                  <button v-if="!['delivered','cancelled'].includes(so.status)" class="btn btn-success btn-sm" @click="confirmFulfill(so.id)">▶</button>
                  <button v-if="so.status==='shipped'" class="btn btn-primary btn-sm" @click="db.deliverSO(so.id)">✓</button>
                  <button class="btn btn-ghost btn-sm" @click="modal.open('s_payment',null,{client_id:so.client_id,order_id:so.id})" title="Add Payment">💰</button>
                  <button class="btn btn-ghost btn-sm" @click="shareOrder(so,'wa')" title="WhatsApp">📱</button>
                  <button class="btn btn-ghost btn-sm" @click="shareOrder(so,'email')" title="Email">✉</button>
                  <button class="btn btn-ghost btn-sm" @click="modal.open('so',so)">Edit</button>
                  <button class="btn btn-danger btn-sm" @click="tryDelete(so.id)">Del</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between px-4 py-3 border-t" style="border-color:var(--border)">
        <span style="font-size:12px;color:var(--text2)">{{ filtered.length }} orders · Revenue: <b style="color:var(--accent3)">{{ fmtNum(filteredRevenue) }} DZD</b></span>
      </div>
    </div>
  </div>
</template>
