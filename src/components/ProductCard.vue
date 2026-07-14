<template>
  <div
    class="group relative theme-panel rounded-2xl border transition-all overflow-hidden flex flex-col h-full theme-slide-up"
    :class="isSoldOut(product)
      ? 'cursor-pointer opacity-85 grayscale-[0.25] saturate-50 border-rose-300/60 dark:border-rose-900/40 hover:-translate-y-0 hover:shadow-none hover:border-rose-300/60 dark:hover:border-rose-900/40'
      : 'cursor-pointer theme-card-interactive'"
    :style="{ animationDelay: `${index * animationStep}ms` }"
    @click="$emit('click', product.slug)">
    <!-- Image Area -->
    <div class="aspect-[4/3] overflow-hidden theme-surface-muted relative shrink-0">
      <div
        class="absolute inset-0 z-10 transition-colors duration-300"
        :class="isSoldOut(product) ? 'bg-black/15' : 'bg-black/15 group-hover:bg-black/5'"
      ></div>
      <img v-if="displayImageSrc && !imageErrored" :src="displayImageSrc"
        :alt="getLocalizedText(product.title)" loading="lazy" decoding="async"
        class="w-full h-full object-cover transform transition-transform duration-700 ease-out"
        :class="[
          isSoldOut(product) ? 'grayscale brightness-75' : 'group-hover:scale-105',
        ]"
        @error="handleImageError" />
      <div v-else class="w-full h-full flex items-center justify-center theme-text-muted" role="img"
        :aria-label="getLocalizedText(product.title)">
        <svg class="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <div v-if="isSoldOut(product)" class="absolute inset-0 z-20 bg-black/45"></div>
      <div v-if="isSoldOut(product)"
        class="absolute left-2 top-2 md:left-4 md:top-4 z-30 theme-badge theme-badge-solid-danger text-xs font-bold tracking-wider shadow-sm">
        {{ t('products.stockStatus.outOfStock') }}
      </div>

      <!-- Tags -->
      <div v-if="!isSoldOut(product) && product.tags && product.tags.length > 0"
        class="absolute top-2 right-2 md:top-4 md:right-4 z-20 flex flex-col gap-1 md:gap-1.5 items-end">
        <span v-for="(tag, tagIndex) in product.tags.slice(0, maxTags)" :key="tagIndex"
          class="theme-badge theme-badge-inverse px-2 md:px-3 py-0.5 md:py-1 text-xs font-medium">
          {{ tag }}
        </span>
        <span v-if="isGptCredentialProduct && !gptInventoryEmpty"
          class="flex items-center gap-1 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[11px] font-semibold bg-emerald-500/90 text-white backdrop-blur-sm shadow whitespace-nowrap">
          <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {{ t('products.credentialAvailable') }}
        </span>
      </div>

      <div v-if="gptInventoryEmpty && isGptCredentialProduct"
        class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-1.5 bg-black/60 backdrop-blur-[1px]">
        <svg class="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span class="text-white font-bold text-sm tracking-wide drop-shadow">{{ t('products.credentialMissing') }}</span>
        <span class="text-white/70 text-[11px] text-center px-4 leading-tight">{{ t('products.credentialUnavailable') }}</span>
      </div>

      <div v-if="Number(product.total_sold || 0) > 0"
        class="absolute bottom-2 right-2 z-30 flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1">
        <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span class="text-[11px] font-semibold text-white/90 leading-none whitespace-nowrap">
          {{ t('products.totalSold') }} {{ product.total_sold }}
        </span>
      </div>
    </div>

    <!-- Content Area -->
    <div class="p-3 md:p-4 relative z-20 flex flex-col flex-1">
      <div v-if="product.category?.name" class="text-xs theme-text-muted uppercase tracking-wider mb-1 md:mb-2 truncate">
        {{ t('products.categoryLabel') }} · {{ getLocalizedText(product.category.name) }}
      </div>
      <h3 class="text-sm md:text-lg font-bold theme-text-primary mb-1 md:mb-2 transition-colors line-clamp-1">
        {{ getLocalizedText(product.title) }}
      </h3>

      <!-- Badges -->
      <div class="mb-2 md:mb-3 flex flex-wrap items-center gap-1 md:gap-2">
        <!-- Mobile: show only fulfillment type badge -->
        <span class="md:hidden theme-badge text-xs"
          :class="product.fulfillment_type === 'auto' ? 'theme-badge-info' : 'theme-badge-neutral'">
          {{ getFulfillmentTypeLabel(product.fulfillment_type) }}
        </span>

        <!-- Desktop: show all badges -->
        <span class="hidden md:inline-flex theme-badge"
          :class="product.purchase_type === 'guest' ? 'theme-badge-warning' : 'theme-badge-success'">
          <svg v-if="product.purchase_type === 'guest'" class="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
            <circle cx="9.5" cy="7" r="3" stroke-width="2" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 8l2 2-2 2" />
          </svg>
          <svg v-else class="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="11" width="18" height="10" rx="2" ry="2" stroke-width="2" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V8a5 5 0 0110 0v3" />
          </svg>
          {{ getPurchaseTypeLabel(product.purchase_type) }}
        </span>

        <span class="hidden md:inline-flex theme-badge"
          :class="product.fulfillment_type === 'auto' ? 'theme-badge-info' : 'theme-badge-neutral'">
          <svg v-if="product.fulfillment_type === 'auto'" class="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          <svg v-else class="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.7 6.3l3 3m-9.4 9.4l-4 1 1-4 9.9-9.9a2.1 2.1 0 013 3L8.3 18.7z" />
          </svg>
          {{ getFulfillmentTypeLabel(product.fulfillment_type) }}
        </span>

        <span class="hidden md:inline-flex theme-badge"
          :class="getStockBadgeClass(product.stock_status)">
          {{ getStockStatusLabel(product) }}
        </span>
      </div>

      <p class="hidden md:block theme-text-secondary text-sm mb-6 line-clamp-2">
        {{ getLocalizedText(product.description) }}
      </p>

      <div class="flex items-center justify-between border-t theme-border pt-2 md:pt-4 mt-auto">
        <div class="flex flex-col">
          <span class="hidden md:block text-xs theme-text-muted uppercase tracking-wider">{{ t('products.price') }}</span>
          <div class="flex items-baseline gap-1.5 flex-wrap">
            <span
              v-if="hasPromotionPrice(product)"
              class="theme-price-sm text-rose-600 dark:text-rose-300"
              :aria-label="t('products.promotionPriceAria', { price: formatPrice(getPromotionPriceAmount(product), siteCurrency) })"
            >
              {{ formatPrice(getPromotionPriceAmount(product), siteCurrency) }}
            </span>
            <span
              v-else
              class="theme-price-sm theme-text-primary"
              :aria-label="t('products.priceAria', { price: formatPrice(product.price_amount, siteCurrency) })"
            >
              {{ formatPrice(product.price_amount, siteCurrency) }}
            </span>
            <span v-if="usdPrice" class="text-[11px] font-normal theme-text-muted whitespace-nowrap">
              ≈ ${{ usdPrice }}
            </span>
          </div>
          <div v-if="hasPromotionPrice(product)" class="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              class="hidden md:inline text-xs theme-text-muted opacity-80 line-through"
              :aria-label="t('products.originalPriceAria', { price: formatPrice(product.price_amount, siteCurrency) })"
            >{{ formatPrice(product.price_amount, siteCurrency) }}</span>
            <span class="theme-badge theme-badge-danger theme-badge-xs">
              {{ t('products.promotionTag') }}
            </span>
          </div>
          <div v-else-if="hasPromotionRules(product)" class="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span class="theme-badge theme-badge-warning theme-badge-xs">
              {{ t('products.promotionBadge') }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Quick buy cart button -->
          <button
            type="button"
            :aria-label="t('products.quickBuyAria')"
            class="relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg border transition-all"
            :class="isSoldOut(product)
              ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-100 dark:hover:text-white dark:hover:border-gray-500 dark:hover:bg-gray-800'"
            :disabled="isSoldOut(product)"
            :aria-disabled="isSoldOut(product)"
            @click.stop="$emit('quickBuy', product)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </button>
          <!-- Desktop: view details -->
          <span
            class="hidden md:flex text-xs uppercase font-bold transition-colors items-center gap-1"
            :class="isSoldOut(product)
              ? 'text-rose-500/90 dark:text-rose-300/90'
              : 'text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white'">
            <svg class="w-4 h-4 transition-transform" :class="isSoldOut(product) ? '' : 'group-hover:translate-x-1'" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
          <!-- Mobile: arrow only -->
          <svg class="md:hidden w-4 h-4 theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { getFirstImageUrl, getImageUrl } from '../utils/image'
import { useLocalized, useProductLabels } from '../composables/useProduct'

const cnyPerUsd = ref<number | null>(null)
let rateRequest: Promise<void> | null = null

const loadCnyRate = () => {
  if (cnyPerUsd.value !== null) return rateRequest
  if (rateRequest) return rateRequest
  rateRequest = fetch('https://open.er-api.com/v6/latest/USD')
    .then((response) => response.json())
    .then((payload) => {
      const rate = Number(payload?.rates?.CNY)
      if (Number.isFinite(rate) && rate > 0) cnyPerUsd.value = rate
    })
    .catch(() => {
      rateRequest = null
    })
  return rateRequest
}

const props = withDefaults(defineProps<{
  product: any
  index?: number
  maxTags?: number
  animationStep?: number
  gptInventoryEmpty?: boolean
}>(), {
  index: 0,
  maxTags: 2,
  animationStep: 50,
  gptInventoryEmpty: false,
})

defineEmits<{
  click: [slug: string]
  quickBuy: [product: any]
}>()

const { t } = useI18n()
const { getLocalizedText, siteCurrency, formatPrice } = useLocalized()
const { getPurchaseTypeLabel, getFulfillmentTypeLabel, getStockBadgeClass, getStockStatusLabel, isSoldOut, hasPromotionPrice, getPromotionPriceAmount, hasPromotionRules } = useProductLabels()

void loadCnyRate()

const imageErrored = ref(false)
const attemptIdx = ref(0)

const isGptCredentialProduct = computed(() => {
  return Array.isArray(props.product?.tags) && props.product.tags.includes('土区')
})

const currentPriceAmount = computed(() => {
  return hasPromotionPrice(props.product) ? getPromotionPriceAmount(props.product) : props.product?.price_amount
})

const usdPrice = computed(() => {
  if (siteCurrency.value !== 'CNY' || cnyPerUsd.value === null) return ''
  const amount = Number.parseFloat(String(currentPriceAmount.value || ''))
  if (!Number.isFinite(amount)) return ''
  return (amount / cnyPerUsd.value).toFixed(2)
})

const imageCandidates = computed<string[]>(() => {
  const arr: string[] = []
  const primary = getFirstImageUrl(props.product?.images)
  if (primary) arr.push(primary)
  const categoryIcon = props.product?.category?.icon
  if (categoryIcon) {
    const resolved = getImageUrl(categoryIcon)
    if (resolved && resolved !== primary) arr.push(resolved)
  }
  return arr
})

const displayImageSrc = computed(() => imageCandidates.value[attemptIdx.value] ?? '')

watch(imageCandidates, () => {
  attemptIdx.value = 0
  imageErrored.value = false
}, { deep: true })

const handleImageError = () => {
  if (attemptIdx.value < imageCandidates.value.length - 1) {
    attemptIdx.value++
  } else {
    imageErrored.value = true
  }
}
</script>
