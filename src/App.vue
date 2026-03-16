<script setup>
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import ModalManager from '@/components/modals/ModalManager.vue'
import { useModalStore } from '@/stores/modal'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const modal  = useModalStore()
const router = useRouter()

const PAGE_MODAL_MAP = {
  '/products':        'product',
  '/clients':         'client',
  '/end-customers':   'end_customer',
  '/sales-orders':    'so',
  '/purchase-orders': 'po',
  '/movements':       'adjust',
  '/categories':      'category',
  '/suppliers':       'supplier',
  '/s-payments':      's_payment',
  '/p-payments':      'p_payment',
}

const NO_FAB = ['/dashboard', '/alerts', '/analytics', '/reports/client-situation']

function fabModalType() {
  return PAGE_MODAL_MAP[router.currentRoute.value.path] || 'product'
}

function onKey(e) {
  if (modal.visible) { if (e.key === 'Escape') modal.close(); return }
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return
  if (e.key === 'n') modal.open(fabModalType())
}

onMounted(()  => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <AppSidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <AppTopbar />
      <main class="flex-1 overflow-y-auto p-6" style="background:var(--bg)">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
  <ModalManager />
  <button v-if="!NO_FAB.includes($route.path)" class="fab"
    @click="modal.open(fabModalType())" title="New Record (N)">+</button>
</template>
