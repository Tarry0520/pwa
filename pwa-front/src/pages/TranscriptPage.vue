<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Transcript</div>
      <q-badge v-if="!isOnline" color="orange" label="離線" />
      <q-space />
      <q-btn flat icon="refresh" label="Refresh" :loading="loading" @click="onRefresh" />
      <q-btn flat icon="picture_as_pdf" label="Export PDF" @click="onExport" />
    </div>

    <div class="text-caption text-grey-7 q-mb-md">
      Last synced: <span>{{ lastSyncedText }}</span>
    </div>

    <q-skeleton v-if="loading && terms.length === 0" type="rect" height="120px" class="q-mb-md" />

    <div v-for="term in terms" :key="term" class="q-mb-md">
      <q-card>
        <q-card-section class="row items-center justify-between">
          <div class="text-subtitle1">Term: {{ term }}</div>
          <div class="text-body2">GPA：{{ itemsByTerm[term]?.gpa ?? '-' }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-table
            :rows="(itemsByTerm[term]?.courses) || []"
            :columns="columns"
            row-key="courseId"
            flat
            dense
            hide-bottom
          />
        </q-card-section>
      </q-card>
    </div>

    <div v-if="!loading && terms.length === 0" class="text-body2 text-grey-7 q-mt-lg">
      No transcript data. Click "Refresh" to sync recent two academic years.
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useTranscriptsStore } from 'src/stores/transcripts'

const $q = useQuasar()
const store = useTranscriptsStore()

const loading = computed(() => store.loading)
const terms = computed(() => store.terms)
const itemsByTerm = computed(() => store.itemsByTerm)
const lastSyncedText = computed(() => store.lastSyncedAt ? new Date(store.lastSyncedAt).toLocaleString() : 'Not synced yet')
const isOnline = ref(navigator.onLine)

window.addEventListener('online', () => (isOnline.value = true))
window.addEventListener('offline', () => (isOnline.value = false))

const columns = [
  { name: 'name', label: 'Subject', field: 'name', align: 'left' },
  { name: 'credit', label: 'Credits', field: 'credit', align: 'right' },
  { name: 'score', label: 'Score', field: 'score', align: 'right' },
  { name: 'grade', label: 'Grade', field: 'grade', align: 'right' },
  { name: 'rank', label: 'Rank', field: 'rank', align: 'right' },
]

onMounted(async () => {
  await store.loadFromDb()
})

async function onRefresh() {
  const nearTwoTerms = suggestRecentTerms()
  const res = await store.sync({ terms: nearTwoTerms, force: true })
  if (res?.ok) {
    $q.notify({ type: 'positive', message: 'Transcript synced' })
  } else if (res?.skipped) {
    $q.notify({ type: 'info', message: 'Data is up to date' })
  } else {
    $q.notify({ type: 'negative', message: res?.error || 'Sync failed' })
  }
}

function onExport() {
  store.exportPdf()
}

function suggestRecentTerms() {
  // Recent two academic years (four terms): go back 3 terms from current term
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const current = { y: year, t: month >= 8 ? 1 : 2 }

  const toLabel = ({ y, t }) => `${y}-${t}`
  const prev = ({ y, t }) => (t === 1 ? { y: y, t: 2 } : { y: y - 1, t: 1 })

  const terms = []
  let cur = current
  for (let i = 0; i < 4; i++) {
    terms.push(toLabel(cur))
    cur = prev(cur)
  }
  return terms
}
</script>

<style scoped>
</style>
