<script setup>
import { reactive, computed } from 'vue'
import ModalShell from './ModalShell.vue'
import { useDbStore } from '@/stores/db'
import { useModalStore } from '@/stores/modal'

const emit  = defineEmits(['close'])
const db    = useDbStore()
const modal = useModalStore()
const isEdit = computed(() => !!modal.editId)

const form = reactive({
  name: '', abr: '', ref: '',
  ...(modal.editData || {})
})

// Auto-generate ABR from name if not manually set
function onNameInput() {
  if (!form.abr || form.abr === form.name.substring(0,4).toUpperCase().slice(0,-1)) {
    form.abr = form.name.substring(0,4).toUpperCase()
  }
}

function save() {
  if (!form.name.trim()) return alert('Category name is required')
  if (!form.abr.trim())  form.abr = form.name.substring(0,4).toUpperCase()
  db.saveCategory({ name: form.name.trim(), abr: form.abr.trim().toUpperCase(), ref: form.ref.trim() }, modal.editId)
  emit('close')
}
</script>

<template>
  <ModalShell :title="isEdit ? 'Edit Category' : 'New Category'" :edit-mode="isEdit" size="sm"
    @close="emit('close')" @save="save">
    <div class="space-y-4">
      <div class="input-wrap">
        <label>Category Name *</label>
        <input class="input" v-model="form.name" placeholder="e.g. Electronics" @input="onNameInput"/>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="input-wrap">
          <label>Abbreviation (ABR) *</label>
          <input class="input" v-model="form.abr" placeholder="ELEC" maxlength="6"
            style="text-transform:uppercase" @input="form.abr = form.abr.toUpperCase()"/>
        </div>
        <div class="input-wrap">
          <label>Reference Code</label>
          <input class="input" v-model="form.ref" placeholder="CAT-001"/>
        </div>
      </div>
    </div>
  </ModalShell>
</template>
