<template>
  <div class="min-h-screen theme-page pt-24 pb-16">
    <div class="container mx-auto px-4">
      <div class="mx-auto max-w-6xl">
        <section class="rounded-2xl border theme-panel overflow-hidden mb-6">
          <div class="border-b theme-border bg-gray-50/60 dark:bg-white/[0.02] px-6 py-5">
            <h1 class="text-2xl md:text-3xl font-black theme-text-primary">{{ t('batchQuery.title') }}</h1>
            <p class="mt-2 text-sm theme-text-muted">{{ t('batchQuery.subtitle') }}</p>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="queryCards">
            <div>
              <label class="mb-2 block text-sm font-medium theme-text-secondary">{{ t('batchQuery.inputLabel') }}</label>
              <textarea
                v-model="inputText"
                rows="8"
                class="form-input-lg w-full font-mono text-sm"
                :placeholder="t('batchQuery.inputPlaceholder')"
              />
              <p class="mt-2 text-xs theme-text-muted">{{ t('batchQuery.inputHint') }}</p>
            </div>
            <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {{ errorMessage }}
            </div>
            <div class="flex flex-wrap gap-3">
              <button type="submit" class="theme-btn-inline-md theme-btn-primary border font-bold" :disabled="loading">
                {{ loading ? t('batchQuery.btnQuerying') : t('batchQuery.btnQuery') }}
              </button>
              <button type="button" class="theme-btn-inline-md theme-btn-secondary border font-semibold" :disabled="loading" @click="clearInput">
                {{ t('batchQuery.btnClearInput') }}
              </button>
              <button type="button" class="theme-btn-inline-md theme-btn-ghost border font-semibold" :disabled="loading || results.length === 0" @click="clearResult">
                {{ t('batchQuery.btnClearResult') }}
              </button>
            </div>
          </form>
        </section>

        <section v-if="results.length" class="rounded-2xl border theme-panel overflow-hidden">
          <div class="border-b theme-border bg-gray-50/60 dark:bg-white/[0.02] px-6 py-5">
            <div class="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard :label="t('batchQuery.statsTotal')" :value="stats.total" />
              <StatCard :label="t('batchQuery.statsFound')" :value="stats.found" />
              <StatCard :label="t('batchQuery.statsUnused')" :value="stats.unused" />
              <StatCard :label="t('batchQuery.statsUsed')" :value="stats.used" />
              <StatCard :label="t('batchQuery.statsInvalid')" :value="stats.invalid" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2 border-b theme-border px-6 py-4">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              class="rounded-xl border px-3 py-2 text-xs font-semibold transition"
              :class="activeTab === tab.value ? 'theme-btn-primary' : 'theme-btn-secondary'"
              @click="activeTab = tab.value"
            >
              {{ t(tab.label) }}
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="theme-panel-muted border-b theme-border text-xs uppercase tracking-wider theme-text-muted">
                <tr>
                  <th class="px-4 py-3">{{ t('batchQuery.colCard') }}</th>
                  <th class="px-4 py-3">{{ t('batchQuery.colStatus') }}</th>
                  <th class="px-4 py-3">{{ t('batchQuery.colProduct') }}</th>
                  <th class="px-4 py-3">{{ t('batchQuery.colUser') }}</th>
                  <th class="px-4 py-3">{{ t('batchQuery.colUpdatedAt') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                <tr v-for="item in filteredResults" :key="item.cardInfo" class="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <td class="px-4 py-3 font-mono text-xs theme-text-primary">{{ item.cardInfo }}</td>
                  <td class="px-4 py-3">
                    <span class="theme-badge" :class="statusBadgeClass(item.status)">{{ statusText(item.status) }}</span>
                  </td>
                  <td class="px-4 py-3 theme-text-secondary">{{ item.productName || '-' }}</td>
                  <td class="px-4 py-3 theme-text-secondary">{{ item.userEmail || item.user || '-' }}</td>
                  <td class="px-4 py-3 theme-text-muted">{{ item.updatedAt || item.updated_at || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface BatchResult {
  cardInfo: string
  status?: string
  productName?: string
  userEmail?: string
  user?: string
  updatedAt?: string
  updated_at?: string
  [key: string]: unknown
}

const inputText = ref('')
const loading = ref(false)
const errorMessage = ref('')
const results = ref<BatchResult[]>([])
const activeTab = ref('all')

const tabs = [
  { value: 'all', label: 'batchQuery.tabAll' },
  { value: 'unused', label: 'batchQuery.tabUnused' },
  { value: 'used', label: 'batchQuery.tabUsed' },
  { value: 'disabled', label: 'batchQuery.tabDisabled' },
  { value: 'not_found', label: 'batchQuery.tabNotFound' },
]

const cardInfos = computed(() => {
  return inputText.value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
})

const normalizeStatus = (status?: string) => {
  const text = String(status || '').trim().toLowerCase()
  if (text === 'notfound') return 'not_found'
  if (text === 'invalid') return 'not_found'
  return text || 'not_found'
}

const stats = computed(() => {
  const values = results.value.map((item) => normalizeStatus(item.status))
  return {
    total: results.value.length,
    found: values.filter((status) => status !== 'not_found').length,
    unused: values.filter((status) => status === 'unused').length,
    used: values.filter((status) => status === 'used').length,
    invalid: values.filter((status) => status === 'not_found').length,
  }
})

const filteredResults = computed(() => {
  if (activeTab.value === 'all') return results.value
  return results.value.filter((item) => normalizeStatus(item.status) === activeTab.value)
})

const statusText = (status?: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'unused') return t('batchQuery.statusUnused')
  if (normalized === 'used') return t('batchQuery.statusUsed')
  if (normalized === 'disabled') return t('batchQuery.statusDisabled')
  return t('batchQuery.statusNotFound')
}

const statusBadgeClass = (status?: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'unused') return 'theme-badge-success'
  if (normalized === 'used') return 'theme-badge-info'
  if (normalized === 'disabled') return 'theme-badge-warning'
  return 'theme-badge-danger'
}

const queryCards = async () => {
  errorMessage.value = ''
  if (cardInfos.value.length === 0) {
    errorMessage.value = t('batchQuery.errors.emptyInput')
    return
  }
  loading.value = true
  try {
    const response = await fetch('/cdk-api/api/cards/batch-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardInfos: cardInfos.value }),
    })
    const payload = await response.json()
    applyResults(payload)
  } catch {
    errorMessage.value = t('batchQuery.errors.networkError')
  } finally {
    loading.value = false
  }
}

const applyResults = (payload: any) => {
  if (payload?.success && Array.isArray(payload.data)) {
    results.value = payload.data.map(normalizeResult)
    activeTab.value = 'all'
    return
  }
  errorMessage.value = String(payload?.message || t('batchQuery.errors.queryFailed'))
}

const normalizeResult = (item: any): BatchResult => {
  return {
    ...item,
    cardInfo: String(item.cardInfo || item.card_info || item.card || ''),
    productName: String(item.productName || item.product_name || item.product || ''),
    userEmail: String(item.userEmail || item.user_email || item.email || ''),
  }
}

const clearInput = () => {
  inputText.value = ''
}

const clearResult = () => {
  results.value = []
  activeTab.value = 'all'
  errorMessage.value = ''
}

const StatCard = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-xl border theme-panel-soft px-4 py-3' }, [
      h('div', { class: 'text-xs theme-text-muted' }, props.label),
      h('div', { class: 'mt-1 text-xl font-bold theme-text-primary' }, String(props.value)),
    ])
  },
})
</script>
