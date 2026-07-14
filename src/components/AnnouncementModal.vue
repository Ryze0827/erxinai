<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" @click.self="close">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-md rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden">
          <div class="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/10">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
            <h2 class="text-white font-semibold text-lg">{{ t('announcement.title') }}</h2>
          </div>
          <div class="px-6 py-5">
            <p class="text-white/80 text-sm leading-relaxed">{{ t('announcement.content') }}</p>
          </div>
          <div class="flex items-center justify-between gap-3 px-6 pb-6">
            <label class="flex items-center gap-2 cursor-pointer select-none group">
              <input v-model="doNotShowAgain" type="checkbox" class="w-4 h-4 rounded border border-white/30 bg-transparent accent-emerald-500 cursor-pointer" />
              <span class="text-white/50 text-sm group-hover:text-white/70 transition-colors">
                {{ t('announcement.doNotShowAgain') }}
              </span>
            </label>
            <button class="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors" @click="confirm">
              {{ t('announcement.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const visible = ref(false)
const doNotShowAgain = ref(false)

const DISMISSED_KEY = 'announcement_dismissed'
const LAST_SHOWN_KEY = 'announcement_last_shown'

const todayKey = () => new Date().toISOString().slice(0, 10)

const close = () => {
  visible.value = false
}

const confirm = () => {
  if (doNotShowAgain.value) localStorage.setItem(DISMISSED_KEY, 'true')
  close()
}

onMounted(() => {
  if (localStorage.getItem(DISMISSED_KEY) === 'true') return
  const today = todayKey()
  if (localStorage.getItem(LAST_SHOWN_KEY) === today) return
  localStorage.setItem(LAST_SHOWN_KEY, today)
  visible.value = true
})
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .relative,
.modal-fade-leave-to .relative {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}
</style>
