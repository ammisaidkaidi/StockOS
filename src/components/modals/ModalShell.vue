<script setup>
defineProps({
  title:  { type: String, required: true },
  sub:    { type: String, default: '' },
  size:   { type: String, default: 'md' }, // 'sm' | 'md' | 'lg'
  saving: { type: Boolean, default: false },
  hideFooter: { type: Boolean, default: false },
  editMode: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'save'])
</script>

<template>
  <div class="modal" :class="{ 'modal-lg': size === 'lg', 'modal-sm': size === 'sm' }">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b" style="border-color:var(--border)">
      <div>
        <h2 class="font-display font-bold text-lg">{{ title }}</h2>
        <p v-if="sub" style="font-size:12px;color:var(--text2);margin-top:3px">{{ sub }}</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="emit('close')">✕</button>
    </div>

    <!-- Body -->
    <div class="p-6">
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="!hideFooter" class="flex items-center justify-end gap-3 px-6 pb-6">
      <button class="btn btn-ghost" @click="emit('close')">Cancel</button>
      <button class="btn btn-primary" :disabled="saving" @click="emit('save')">
        {{ saving ? 'Saving…' : editMode ? 'Save Changes' : 'Create' }}
      </button>
    </div>
  </div>
</template>
