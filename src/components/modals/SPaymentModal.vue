<script setup>
import { reactive, computed } from 'vue'
import ModalShell from './ModalShell.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
import { useDbStore } from '@/stores/db'
import { useModalStore } from '@/stores/modal'
import { useSettingsStore } from '@/stores/settings'
import { fmtNum } from '@/utils/helpers'

const emit = defineEmits(['close'])
const db = useDbStore(), modal = useModalStore(), settings = useSettingsStore()
const isEdit = computed(() => !!modal.editId)
const todayISO = new Date().toISOString().split('T')[0]

const form = reactive({
  amount: 0, client_id: modal.prefill?.client_id || '',
  order_id: modal.prefill?.order_id || '', notes: '', date: todayISO,
  ...(modal.editData || {})
})

const clientOptions = computed(() => db.clients.map(c => ({ value: c.id, label: c.full_name, sub: c.phone||'' })))
const orderOptions  = computed(() => {
  const sos = form.client_id ? db.salesOrders.filter(o => o.client_id === form.client_id) : db.salesOrders
  return sos.map(o => {
    const paid = db.soPaymentTotal(o.id)
    return { value: o.id, label: o.so_number, sub: `Total: ${fmtNum(o.total)} · Paid: ${fmtNum(paid)} · Due: ${fmtNum((o.total||0)-paid)}` }
  })
})

const selectedOrder = computed(() => db.salesOrders.find(o => o.id === form.order_id))
const alreadyPaid   = computed(() => form.order_id ? db.soPaymentTotal(form.order_id) - (isEdit.value ? (modal.editData?.amount||0) : 0) : 0)
const remaining     = computed(() => (selectedOrder.value?.total||0) - alreadyPaid.value)

function save() {
  if (!form.amount || form.amount <= 0) return alert('Amount must be > 0')
  db.saveSPayment({ ...form }, modal.editId); emit('close')
}
</script>
<template>
  <ModalShell :title="isEdit ? 'Edit Sales Payment' : 'New Sales Payment'" :edit-mode="isEdit" @close="emit('close')" @save="save">
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="input-wrap"><label>Date</label><input type="date" class="input" v-model="form.date"/></div>
        <div class="input-wrap"><label>Amount (DZD) *</label><input type="number" class="input" v-model.number="form.amount" min="0"/></div>
        <div class="input-wrap"><label>Client</label><SearchableSelect :options="clientOptions" v-model="form.client_id" placeholder="Select client…" :search-mode="settings.searchMode" clearable/></div>
        <div class="input-wrap"><label>Sales Order</label><SearchableSelect :options="orderOptions" v-model="form.order_id" placeholder="Select order…" :search-mode="settings.searchMode" clearable/></div>
        <div class="input-wrap col-span-2"><label>Notes</label><textarea class="input" v-model="form.notes" rows="2"/></div>
      </div>
      <div v-if="selectedOrder" class="alert-row">
        <div class="space-y-1 w-full">
          <div class="flex justify-between text-xs" style="color:var(--text2)">
            <span>Order Total</span><b class="font-mono">{{ fmtNum(selectedOrder.total) }} DZD</b>
          </div>
          <div class="flex justify-between text-xs" style="color:var(--accent3)">
            <span>Already Paid</span><b class="font-mono">{{ fmtNum(alreadyPaid) }} DZD</b>
          </div>
          <div class="flex justify-between text-xs" :style="remaining < 0 ? 'color:var(--danger)' : 'color:var(--warn)'">
            <span>Remaining</span><b class="font-mono">{{ fmtNum(remaining) }} DZD</b>
          </div>
        </div>
      </div>
    </div>
  </ModalShell>
</template>
