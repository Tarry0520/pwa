<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">課表 / 行事曆</div>
      <q-space />
      <q-input v-model="term" dense outlined style="width: 160px" placeholder="例如 2024-1" />
      <q-btn flat icon="refresh" label="刷新" :loading="loading" @click="onRefresh" />
    </div>

    <div class="text-caption text-grey-7 q-mb-md">最後同步：<span>{{ lastSyncedText }}</span></div>

    <q-card class="q-mb-md">
      <q-card-section class="text-subtitle2">課表（{{ term || '未選擇' }}）</q-card-section>
      <q-separator />
      <q-card-section>
        <q-table
          :rows="scheduleEntries"
          :columns="columns"
          row-key="__rowKey"
          flat
          dense
          hide-bottom
          :loading="loading"
        />
      </q-card-section>
    </q-card>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle2">本月行事</div>
        <q-btn dense flat icon="refresh" @click="onRefreshEvents" />
      </q-card-section>
      <q-separator />
      <q-list separator>
        <q-item v-for="ev in events" :key="ev.id">
          <q-item-section top>
            <q-item-label class="text-weight-medium">{{ ev.title }}</q-item-label>
            <q-item-label caption>{{ formatDate(ev.date) }} · {{ ev.location || ev.type }}</q-item-label>
          </q-item-section>
        </q-item>
        <div v-if="!loading && events.length === 0" class="text-body2 text-grey-7 q-pa-md">本月暫無行事</div>
      </q-list>
    </q-card>
  </q-page>
  
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useScheduleStore } from 'src/stores/schedule'
import { useEventsStore } from 'src/stores/events'

const $q = useQuasar()
const schedule = useScheduleStore()
const eventsStore = useEventsStore()

const loading = computed(() => schedule.loading || eventsStore.loading)
const lastSyncedText = computed(() => {
  const t = schedule.lastSyncedAt || eventsStore.lastSyncedAt
  return t ? new Date(t).toLocaleString() : '尚未同步'
})

const term = ref('')

const columns = [
  { name: 'weekday', label: '星期', field: 'weekday', align: 'left' },
  { name: 'period', label: '節次', field: 'period', align: 'right' },
  { name: 'courseId', label: '課程', field: 'courseId', align: 'left' },
  { name: 'room', label: '教室', field: 'room', align: 'left' },
  { name: 'teacher', label: '教師', field: 'teacher', align: 'left' },
]

const scheduleEntries = computed(() => {
  const t = term.value
  const rec = t ? schedule.byTerm[t] : null
  const rows = (rec?.entries || []).map((e, idx) => ({ __rowKey: `${idx}-${e.courseId}`, ...e }))
  // sort by weekday, period
  rows.sort((a, b) => a.weekday - b.weekday || a.period - b.period)
  return rows
})

const events = computed(() => {
  return eventsStore.items.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)))
})

onMounted(async () => {
  const now = new Date()
  const guessTerm = `${now.getFullYear()}-${now.getMonth() + 1 >= 8 ? 1 : 2}`
  term.value = guessTerm
  await schedule.loadFromDb(guessTerm)
  await eventsStore.loadFromDb(currentMonthRange())
})

async function onRefresh() {
  if (!term.value) {
    $q.notify({ type: 'warning', message: '請輸入學期（例如 2024-1）' })
    return
  }
  const res = await schedule.sync({ term: term.value, force: true })
  $q.notify({ type: res.ok ? 'positive' : 'negative', message: res.ok ? '課表已同步' : res.error })
}

async function onRefreshEvents() {
  const res = await eventsStore.sync({ term: 'current', force: true, range: currentMonthRange() })
  $q.notify({ type: res.ok ? 'positive' : 'negative', message: res.ok ? '行事曆已同步' : res.error })
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}
</script>

<style scoped>
</style>

