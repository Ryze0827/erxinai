<template>
  <div class="products-page min-h-screen theme-page pt-20 pb-16">
    <div class="container mx-auto px-4">
      <div class="mt-12">
        <main class="flex-1">
          <!-- Loading Skeleton -->
          <div v-if="loading" class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div v-for="i in 6" :key="i"
              class="theme-panel rounded-2xl border overflow-hidden flex flex-col">
              <div class="h-36 md:h-56 theme-skeleton"></div>
              <div class="p-3 md:p-5 space-y-3">
                <div class="h-3 w-16 rounded theme-skeleton"></div>
                <div class="h-5 w-3/4 rounded theme-skeleton"></div>
                <div class="flex gap-2">
                  <div class="h-5 w-14 rounded-full theme-skeleton"></div>
                  <div class="h-5 w-14 rounded-full theme-skeleton"></div>
                </div>
                <div class="h-3 w-full rounded theme-skeleton"></div>
                <div class="h-3 w-2/3 rounded theme-skeleton"></div>
                <div class="border-t theme-border pt-3 flex justify-between items-center">
                  <div class="h-6 w-20 rounded theme-skeleton"></div>
                  <div class="h-4 w-16 rounded theme-skeleton"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Products Grid -->
          <div v-else-if="sortedProducts.length > 0">
            <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4">
              <ProductCard
                v-for="(product, idx) in sortedProducts"
                :key="product.id"
                :product="product"
                :index="idx"
                :max-tags="isMobileGrid ? 1 : 2"
                :animation-step="50"
                :gpt-inventory-empty="gptInventoryEmpty"
                @click="goToProduct"
                @quick-buy="openQuickBuy"
              />
            </div>

            <PaginationNav
              :current-page="currentPage"
              :total-pages="totalPages"
              :loading="loading"
              @change-page="changePage"
            />
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-20 border theme-panel-soft rounded-2xl backdrop-blur-sm theme-slide-up">
            <svg class="w-20 h-20 mx-auto theme-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p class="theme-text-muted text-lg">{{ t('products.empty') }}</p>
          </div>
        </main>
      </div>
    </div>

    <ProductQuickBuy
      v-if="quickBuyProduct"
      :product="quickBuyProduct"
      :visible="quickBuyVisible"
      @update:visible="quickBuyVisible = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProductList } from '../composables/useProductList'
import { usePageSeo } from '../composables/usePageSeo'
import ProductCard from '../components/ProductCard.vue'
import ProductQuickBuy from '../components/ProductQuickBuy.vue'
import PaginationNav from '../components/PaginationNav.vue'

const router = useRouter()
const { t } = useI18n()

const {
  loading,
  products,
  currentPage,
  totalPages,
  changePage,
  clearSearch,
  initialize,
  cleanup,
} = useProductList({ pageSize: 12, homeRouteName: 'products' })

// ==================== SEO ====================
usePageSeo({
  canonicalPath: () => '/products',
  title: () => t('nav.products'),
})

const quickBuyProduct = ref<any>(null)
const quickBuyVisible = ref(false)

const openQuickBuy = (product: any) => {
  quickBuyProduct.value = product
  quickBuyVisible.value = true
}

// Detect mobile 2-col grid (< md breakpoint)
const isMobileGrid = ref(window.innerWidth < 768)
const handleResize = () => {
  isMobileGrid.value = window.innerWidth < 768
}

const GPT_INVENTORY_KEY = 'inventory_gpt_empty'
const gptInventoryEmpty = ref(localStorage.getItem(GPT_INVENTORY_KEY) === 'true')
let inventoryTimer: number | null = null

const sortedProducts = computed(() => {
  return [...products.value].sort((a, b) => {
    const aSoldOut = Boolean(a?.is_sold_out || a?.stock_status === 'out_of_stock')
    const bSoldOut = Boolean(b?.is_sold_out || b?.stock_status === 'out_of_stock')
    if (aSoldOut === bSoldOut) return 0
    return aSoldOut ? 1 : -1
  })
})

const loadGptInventoryState = async () => {
  try {
    const response = await fetch('/cdk-api/api/cards/gpt-inventory')
    if (!response.ok) return
    const result = await response.json()
    const empty = Boolean(result?.data?.empty)
    gptInventoryEmpty.value = empty
    localStorage.setItem(GPT_INVENTORY_KEY, String(empty))
  } catch {
    // Ignore inventory health failures; product purchase remains usable.
  }
}

const startInventoryPolling = () => {
  void loadGptInventoryState()
  inventoryTimer = window.setInterval(loadGptInventoryState, 60000)
}

const stopInventoryPolling = () => {
  if (inventoryTimer === null) return
  window.clearInterval(inventoryTimer)
  inventoryTimer = null
}

const goToProduct = (slug: string) => {
  router.push(`/products/${slug}`)
}

onMounted(async () => {
  window.addEventListener('resize', handleResize, { passive: true })
  startInventoryPolling()
  clearSearch()
  await initialize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  stopInventoryPolling()
  cleanup()
})
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
</style>
