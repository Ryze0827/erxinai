<template>
  <footer class="relative theme-panel-strong theme-text-secondary border-t theme-border overflow-hidden">
    <div class="container mx-auto px-4 py-16 relative">
      <div class="grid grid-cols-1 gap-8 mb-16 md:grid-cols-3 md:gap-12">
        <div class="space-y-6 md:col-span-2">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 theme-btn-primary rounded-lg flex items-center justify-center">
              <span class="text-white font-black text-sm">{{ brandInitial }}</span>
            </div>
            <h3 class="theme-text-primary text-xl font-bold tracking-tight">{{ brandSiteName }}</h3>
          </div>
          <p class="text-sm leading-relaxed max-w-sm theme-text-muted">
            {{ brandDescription || t('footer.description') }}
          </p>
        </div>

        <div>
          <h4 class="theme-text-primary font-bold mb-6 tracking-wide">{{ t('footer.quickLinks') }}</h4>
          <ul class="space-y-3 text-sm">
            <li v-for="item in quickLinks" :key="item.path">
              <router-link :to="item.path" class="theme-link-muted transition-colors flex items-center gap-2 group">
                <svg class="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-80 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" :d="item.icon" />
                </svg>
                {{ t(item.label) }}
              </router-link>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t theme-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs theme-text-muted">
        <p>&copy; {{ currentYear }} {{ brandSiteName }}. {{ t('footer.rights') }}</p>
        <div class="flex flex-col items-center gap-2 md:items-end">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center md:justify-end">
            <router-link to="/privacy" class="hover:text-gray-900 dark:hover:text-gray-400">
              {{ t('footer.privacy') || 'Privacy Policy' }}
            </router-link>
            <router-link to="/terms" class="hover:text-gray-900 dark:hover:text-gray-400">
              {{ t('footer.terms') || 'Terms of Service' }}
            </router-link>
          </div>
          <div v-if="footerLinks.length" class="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center md:justify-end">
            <router-link
              v-for="link in footerLinks"
              :key="link.name"
              :to="link.url"
              class="hover:text-gray-900 dark:hover:text-gray-400"
            >{{ link.name }}</router-link>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'
import { isInternalRoute } from '../utils/navigation'

const { t } = useI18n()
const appStore = useAppStore()

const config = computed(() => appStore.config)

const brandSiteName = computed(() => {
  const siteName = config.value?.brand?.site_name
  return typeof siteName === 'string' && siteName.trim() ? siteName.trim() : 'Erxin AI'
})

const brandDescription = computed(() => {
  const desc = config.value?.brand?.site_description
  if (desc && typeof desc === 'object') {
    const val = desc[appStore.locale] || desc['zh-CN'] || ''
    return typeof val === 'string' ? val.trim() : ''
  }
  return ''
})

const brandInitial = computed(() => brandSiteName.value.charAt(0).toUpperCase())
const isListMode = computed(() => config.value?.template_mode === 'list')
const navConfig = computed(() => config.value?.nav_config as { builtin?: Record<string, boolean> } | undefined)

const quickLinks = computed(() => {
  const items = [
    { path: '/', label: 'nav.home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  ]
  if (!isListMode.value) {
    items.push({ path: '/products', label: 'nav.products', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' })
  }
  const builtin = navConfig.value?.builtin
  if (!builtin || builtin.blog !== false) {
    items.push({ path: '/blog', label: 'nav.blog', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2' })
  }
  if (!builtin || builtin.about !== false) {
    items.push({ path: '/about', label: 'nav.about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
  }
  return items
})

const footerLinks = computed(() => {
  const links = config.value?.footer_links
  if (!Array.isArray(links)) return []
  return links
    .filter((item: any) => item && typeof item.name === 'string' && isInternalRoute(item.url))
    .map((item: any) => ({ name: item.name.trim(), url: item.url.trim() }))
    .filter((item) => item.name !== '')
})

const currentYear = new Date().getFullYear()
</script>
