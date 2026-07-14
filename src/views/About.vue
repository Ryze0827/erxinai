<template>
  <div
    class="about-page min-h-screen theme-page pt-20 pb-16">
    <div class="container mx-auto px-4 max-w-4xl">
      <div class="text-center mb-16 mt-12">
        <h1 class="text-4xl md:text-6xl font-black mb-6 tracking-tight theme-text-primary">{{ heroTitle }}</h1>
        <p
          class="theme-text-secondary max-w-2xl mx-auto text-lg leading-relaxed border-b theme-border pb-8">
          {{ heroSubtitle }}
        </p>
      </div>

      <div
        class="theme-panel backdrop-blur-xl border rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">

        <div v-if="hasIntroduction" class="mb-12">
          <p class="theme-text-secondary text-lg leading-relaxed whitespace-pre-line">
            {{ introductionText }}
          </p>
        </div>

        <div v-if="hasServices" class="mb-12">
          <h2 v-if="servicesTitle" class="text-2xl font-bold theme-text-primary mb-6 flex items-center gap-3">
            <span class="w-1.5 h-8 theme-accent-stick rounded-full"></span>
            {{ servicesTitle }}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="(service, index) in serviceItems"
              :key="`about-service-${index}`"
              class="flex items-start gap-3 p-4 theme-surface-soft rounded-xl border theme-border transition-colors">
              <svg class="w-6 h-6 theme-text-accent flex-shrink-0 mt-0.5" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="theme-text-secondary">{{ service }}</span>
            </div>
          </div>
        </div>

        <div v-if="hasContact">
          <h2 v-if="contactTitle" class="text-2xl font-bold theme-text-primary mb-6 flex items-center gap-3">
            <span class="w-1.5 h-8 theme-accent-stick rounded-full"></span>
            {{ contactTitle }}
          </h2>
          <p v-if="contactText" class="theme-text-secondary mb-8 whitespace-pre-line">
            {{ contactText }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'
import { usePageSeo } from '../composables/usePageSeo'

const { t, locale } = useI18n()
const appStore = useAppStore()

usePageSeo({
  title: () => t('nav.about'),
  canonicalPath: () => '/about',
})

const aboutConfig = computed(() => appStore.config?.about || null)

const resolveLocalizedText = (raw: unknown): string => {
  if (!raw || typeof raw !== 'object') {
    return ''
  }

  const record = raw as Record<string, unknown>
  const lang = String(locale.value || appStore.locale || 'zh-CN')
  const candidates = [record[lang], record['zh-CN'], record['zh-TW'], record['en-US']]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim()
    }
  }

  return ''
}

const heroTitle = computed(() => resolveLocalizedText(aboutConfig.value?.hero?.title))
const heroSubtitle = computed(() => resolveLocalizedText(aboutConfig.value?.hero?.subtitle))
const introductionText = computed(() => resolveLocalizedText(aboutConfig.value?.introduction))
const servicesTitle = computed(() => resolveLocalizedText(aboutConfig.value?.services?.title))
const contactTitle = computed(() => resolveLocalizedText(aboutConfig.value?.contact?.title))
const contactText = computed(() => resolveLocalizedText(aboutConfig.value?.contact?.text))

const serviceItems = computed(() => {
  const raw = aboutConfig.value?.services?.items
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((item) => resolveLocalizedText(item))
    .filter((item) => item !== '')
})

const hasIntroduction = computed(() => introductionText.value !== '')
const hasServices = computed(() => servicesTitle.value !== '' || serviceItems.value.length > 0)
const hasContact = computed(() => contactTitle.value !== '' || contactText.value !== '')

onMounted(async () => {
  if (!appStore.config) {
    await appStore.loadConfig()
  }
})
</script>
