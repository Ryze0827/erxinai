<template>
  <div class="min-h-screen theme-page pt-24 pb-16">
    <div class="container mx-auto px-4">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 rounded-2xl border theme-border theme-panel-soft px-5 py-4">
          <h1 class="text-2xl md:text-3xl font-black theme-text-primary">{{ t('cdkRecharge.title') }}</h1>
          <p class="mt-2 text-sm theme-text-muted">{{ t('cdkRecharge.subtitle') }}</p>
        </div>

        <div class="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div
            v-for="item in stepItems"
            :key="item.value"
            class="rounded-xl border px-3 py-3 text-sm transition"
            :class="step >= item.value ? 'theme-selected-surface' : 'theme-panel-soft theme-text-muted'"
          >
            <div class="text-xs font-mono opacity-70">0{{ item.value }}</div>
            <div class="mt-1 font-semibold">{{ t(item.label) }}</div>
          </div>
        </div>

        <Transition name="step-fade" mode="out-in">
          <section v-if="step === 1" key="step-1" class="rounded-2xl border theme-panel overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b theme-border bg-gray-50/50 dark:bg-white/[0.02]">
              <h2 class="text-lg font-bold theme-text-primary">{{ t('cdkRecharge.step1.heading') }}</h2>
            </div>
            <form class="space-y-5 p-6" @submit.prevent="verifyCard">
              <div>
                <label class="mb-2 block text-sm font-medium theme-text-secondary">{{ t('cdkRecharge.step1.label') }}</label>
                <textarea
                  v-model.trim="cardInfo"
                  rows="4"
                  class="form-input-lg w-full font-mono"
                  :placeholder="t('cdkRecharge.step1.placeholder')"
                />
                <p class="mt-2 text-xs theme-text-muted">{{ t('cdkRecharge.step1.hint') }}</p>
              </div>
              <AlertMessage v-if="alertMessage" :level="alertLevel" :message="alertMessage" />
              <button type="submit" class="theme-btn-inline-md theme-btn-primary border font-bold" :disabled="loading">
                {{ loading ? t('cdkRecharge.step1.submitting') : t('cdkRecharge.step1.submit') }}
              </button>
            </form>
          </section>

          <section v-else-if="step === 2" key="step-2" class="rounded-2xl border theme-panel overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b theme-border bg-gray-50/50 dark:bg-white/[0.02]">
              <h2 class="text-lg font-bold theme-text-primary">{{ t('cdkRecharge.step2.heading') }}</h2>
            </div>
            <div class="space-y-5 p-6">
              <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{{ t('cdkRecharge.step2.verified') }}</p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium theme-text-secondary">{{ t('cdkRecharge.step2.jsonLabel') }}</label>
                <textarea
                  v-model.trim="fullAuthData"
                  rows="5"
                  class="form-input-lg w-full font-mono text-xs"
                  :placeholder="t('cdkRecharge.step2.jsonPlaceholder')"
                  @blur="parseAuthData"
                />
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-2 block text-sm font-medium theme-text-secondary">{{ t('cdkRecharge.step2.fieldEmail') }}</label>
                  <input v-model.trim="userEmail" class="form-input-lg w-full" />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium theme-text-secondary">{{ t('cdkRecharge.step2.fieldToken') }}</label>
                  <input v-model.trim="userGptToken" class="form-input-lg w-full font-mono" />
                </div>
              </div>
              <AlertMessage v-if="alertMessage" :level="alertLevel" :message="alertMessage" />
              <div class="flex flex-wrap gap-3">
                <button type="button" class="theme-btn-inline-md theme-btn-secondary border font-semibold" @click="step = 1">
                  {{ t('cdkRecharge.step2.back') }}
                </button>
                <button type="button" class="theme-btn-inline-md theme-btn-primary border font-bold" @click="step = 3">
                  {{ t('cdkRecharge.step2.next') }}
                </button>
              </div>
            </div>
          </section>

          <section v-else-if="step === 3" key="step-3" class="rounded-2xl border theme-panel overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b theme-border bg-gray-50/50 dark:bg-white/[0.02]">
              <h2 class="text-lg font-bold theme-text-primary">{{ t('cdkRecharge.step3.heading') }}</h2>
            </div>
            <div class="space-y-5 p-6">
              <div class="rounded-xl border theme-border divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
                <InfoRow :label="t('cdkRecharge.step3.fieldCard')" :value="cardInfo" />
                <InfoRow :label="t('cdkRecharge.step3.fieldEmail')" :value="userEmail" />
                <InfoRow :label="t('cdkRecharge.step3.fieldToken')" :value="tokenPreview" />
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p class="text-sm text-amber-700 dark:text-amber-200">{{ t('cdkRecharge.step3.warning') }}</p>
              </div>
              <AlertMessage v-if="alertMessage" :level="alertLevel" :message="alertMessage" />
              <div class="flex flex-wrap gap-3">
                <button type="button" class="theme-btn-inline-md theme-btn-secondary border font-semibold" @click="step = 2">
                  {{ t('cdkRecharge.step3.back') }}
                </button>
                <button type="button" class="theme-btn-inline-md theme-btn-primary border font-bold" :disabled="loading" @click="submitRecharge">
                  {{ loading ? t('cdkRecharge.step3.submitting') : t('cdkRecharge.step3.submit') }}
                </button>
              </div>
            </div>
          </section>

          <section v-else key="step-4" class="rounded-2xl border theme-panel overflow-hidden">
            <div class="p-8 text-center">
              <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" :class="resultOk ? 'theme-alert-success' : 'theme-alert-danger'">
                <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="resultOk" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 class="text-xl font-bold theme-text-primary">{{ resultOk ? t('cdkRecharge.step4.successTitle') : t('cdkRecharge.step4.failTitle') }}</h2>
              <p class="mt-2 text-sm theme-text-muted">{{ resultMessage }}</p>
              <div v-if="taskId" class="mx-auto mt-5 max-w-md rounded-xl border theme-border px-4 py-3 text-left">
                <div class="text-xs theme-text-muted">{{ t('cdkRecharge.step4.taskStatus') }}</div>
                <div class="mt-1 font-mono text-sm theme-text-primary">{{ taskId }}</div>
              </div>
              <div class="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" class="theme-btn-inline-md theme-btn-secondary border font-semibold" @click="resetFlow">
                  {{ t('cdkRecharge.step4.rechargeAgain') }}
                </button>
                <router-link to="/" class="theme-btn-inline-md theme-btn-primary border font-bold">
                  {{ t('cdkRecharge.step4.goHome') }}
                </router-link>
              </div>
            </div>
          </section>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const step = ref(1)
const loading = ref(false)
const cardInfo = ref('')
const userEmail = ref('')
const userGptToken = ref('')
const fullAuthData = ref('')
const productId = ref('')
const taskId = ref('')
const resultOk = ref(false)
const resultMessage = ref('')
const alertLevel = ref<'success' | 'warning' | 'error'>('warning')
const alertMessage = ref('')

const stepItems = [
  { value: 1, label: 'cdkRecharge.steps.verify' },
  { value: 2, label: 'cdkRecharge.steps.credentials' },
  { value: 3, label: 'cdkRecharge.steps.confirm' },
  { value: 4, label: 'cdkRecharge.steps.done' },
]

const tokenPreview = computed(() => {
  const token = userGptToken.value.trim()
  if (token.length <= 12) return token || '-'
  return `${token.slice(0, 8)}...${token.slice(-4)}`
})

const setAlert = (level: 'success' | 'warning' | 'error', message: string) => {
  alertLevel.value = level
  alertMessage.value = message
}

const clearAlert = () => {
  alertMessage.value = ''
}

const readJson = async (response: Response) => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

const postCdk = async (path: string, body: Record<string, unknown>) => {
  const response = await fetch(`/cdk-api/api/cards/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readJson(response)
}

const verifyCard = async () => {
  clearAlert()
  if (!cardInfo.value.trim()) {
    setAlert('warning', t('cdkRecharge.errors.cardRequired'))
    return
  }
  loading.value = true
  try {
    const payload = await postCdk('verify', { cardInfo: cardInfo.value.trim() })
    if (payload?.data?.success === true || payload?.success === true) {
      productId.value = String(payload?.data?.productId || payload?.data?.product_id || '')
      step.value = 2
      return
    }
    setAlert('error', String(payload?.data?.message || payload?.message || t('cdkRecharge.errors.verifyFailed')))
  } catch {
    setAlert('error', t('cdkRecharge.errors.networkError'))
  } finally {
    loading.value = false
  }
}

const parseAuthData = () => {
  if (!fullAuthData.value.trim()) return
  try {
    const payload = JSON.parse(fullAuthData.value)
    userEmail.value = String(payload.email || payload.userEmail || userEmail.value || '')
    userGptToken.value = String(payload.accessToken || payload.token || payload.userGptToken || userGptToken.value || '')
    setAlert('success', t('cdkRecharge.step2.parseOk'))
  } catch {
    setAlert('warning', t('cdkRecharge.errors.jsonInvalid'))
  }
}

const ensureCredentials = () => {
  parseAuthData()
  if (!userEmail.value.trim()) return t('cdkRecharge.errors.jsonMissingEmail')
  if (!userGptToken.value.trim()) return t('cdkRecharge.errors.jsonMissingToken')
  return ''
}

const submitRecharge = async () => {
  clearAlert()
  const missing = ensureCredentials()
  if (missing) {
    setAlert('warning', missing)
    step.value = 2
    return
  }
  loading.value = true
  try {
    const payload = await postCdk('verify-gpt', {
      cardInfo: cardInfo.value.trim(),
      userEmail: userEmail.value.trim(),
      userGptToken: userGptToken.value.trim(),
      fullAuthData: fullAuthData.value.trim(),
      productId: productId.value,
    })
    finishRecharge(payload)
  } catch {
    resultOk.value = false
    resultMessage.value = t('cdkRecharge.errors.networkError')
    step.value = 4
  } finally {
    loading.value = false
  }
}

const finishRecharge = (payload: any) => {
  const success = payload?.data?.success === true || payload?.success === true
  resultOk.value = success
  taskId.value = String(payload?.data?.taskId || payload?.data?.task_id || '')
  resultMessage.value = String(payload?.data?.message || payload?.message || (success ? t('cdkRecharge.step4.successDesc') : t('cdkRecharge.errors.submitFailed')))
  step.value = 4
}

const resetFlow = () => {
  step.value = 1
  cardInfo.value = ''
  userEmail.value = ''
  userGptToken.value = ''
  fullAuthData.value = ''
  productId.value = ''
  taskId.value = ''
  resultOk.value = false
  resultMessage.value = ''
  clearAlert()
}

const AlertMessage = defineComponent({
  props: {
    level: { type: String, required: true },
    message: { type: String, required: true },
  },
  setup(props) {
    const className = computed(() => {
      if (props.level === 'success') return 'theme-alert-success'
      if (props.level === 'error') return 'theme-alert-danger'
      return 'theme-alert-warning'
    })
    return () => h('div', { class: ['rounded-xl border px-4 py-3 text-sm', className.value] }, props.message)
  },
})

const InfoRow = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between' }, [
      h('span', { class: 'text-xs font-semibold uppercase tracking-wider theme-text-muted' }, props.label),
      h('span', { class: 'break-all text-sm theme-text-primary font-mono' }, props.value || '-'),
    ])
  },
})
</script>

<style scoped>
.step-fade-enter-active,
.step-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
