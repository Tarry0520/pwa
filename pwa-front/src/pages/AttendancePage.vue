<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Attendance</div>
      <q-space />
      <q-input v-model="term" dense outlined style="width: 160px" placeholder="2025-1" />
      <q-btn flat icon="refresh" label="Sync" :loading="loading" @click="onSync" />
    </div>

    <div class="text-caption text-grey-7 q-mb-md">Last synced: <span>{{ lastSyncedText }}</span></div>

    <q-banner v-if="!isOnline" class="bg-grey-3 text-grey-10 q-mb-md" rounded>
      Currently offline. Leave requests will be queued and sent later.
    </q-banner>

    <q-card flat bordered class="q-mb-md">
      <q-card-section class="text-subtitle2">Leave Request</q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-input v-model="start" label="Start Date (dd/mm/yyyy)" dense outlined mask="##/##/####" :rules="dateRules">
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="start" mask="DD/MM/YYYY" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-4">
            <q-input v-model="end" label="End Date (dd/mm/yyyy)" dense outlined mask="##/##/####" :rules="dateRules">
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="end" mask="DD/MM/YYYY" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-4">
            <q-input v-model="reason" label="Reason" dense outlined />
          </div>
        </div>
        <div class="q-mt-sm">
          <q-btn color="primary" label="Submit Leave" :loading="loading" @click="onSubmitLeave" />
          <span v-if="queue.length" class="text-caption text-grey-7 q-ml-sm">Queue: {{ queue.length }}</span>
        </div>
      </q-card-section>
    </q-card>

    <q-list bordered separator>
      <q-item v-for="r in itemsSorted" :key="r.id">
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ formatDate(r.date) }}</q-item-label>
          <q-item-label caption>{{ r.courseId }}</q-item-label>
          <q-badge :color="badgeColor(r.status)" class="q-mt-xs">{{ r.status }}</q-badge>
        </q-item-section>
      </q-item>
      <div v-if="!loading && itemsSorted.length === 0" class="text-body2 text-grey-7 q-pa-md">No data for this term</div>
    </q-list>

    <div class="q-mt-lg">
      <div class="text-subtitle2 q-mb-sm">My Leave Requests</div>
      <q-list bordered separator>
        <q-item v-for="req in requests" :key="req.id">
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ rangeText(req.dateRange) }}</q-item-label>
            <q-item-label caption>{{ req.reason }}</q-item-label>
            <q-badge :color="req.status === 'approved' ? 'positive' : req.status === 'rejected' ? 'negative' : 'warning'" class="q-mt-xs">{{ req.status }}</q-badge>
          </q-item-section>
          <q-item-section side top>{{ formatDate(req.updatedAt) }}</q-item-section>
        </q-item>
        <div v-if="!loading && requests.length === 0" class="text-body2 text-grey-7 q-pa-md">No leave requests</div>
      </q-list>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { useAttendanceStore } from 'src/stores/attendance'

const $q = useQuasar()
const store = useAttendanceStore()

const loading = computed(() => store.loading)
const items = computed(() => store.items)
const queue = computed(() => store.queue)
const requests = computed(() => store.requests)
const term = ref('2025-1')
const start = ref('') // dd/mm/yyyy
const end = ref('')   // dd/mm/yyyy
const reason = ref('')
const lastSyncedText = computed(() => (store.lastSyncedAt ? new Date(store.lastSyncedAt).toLocaleString() : 'Not synced yet'))
const isOnline = ref(navigator.onLine)

const itemsSorted = computed(() => items.value.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))))

onMounted(async () => {
  await store.loadFromDb(term.value)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

async function onOnline() {
  isOnline.value = true
  const res = await store.flushQueue()
  if (res.ok) $q.notify({ type: 'positive', message: 'Queued leave requests sent' })
}
function onOffline() { isOnline.value = false }

async function onSync() {
  const res = await store.sync({ term: term.value, force: true })
  $q.notify({ type: res.ok ? 'positive' : 'negative', message: res.ok ? 'Attendance synced' : res.error })
}

async function onSubmitLeave() {
  if (!start.value || !end.value || !reason.value) {
    $q.notify({ type: 'warning', message: 'Please fill in complete date and reason' })
    return
  }
  const startIso = sgDateToIsoStart(start.value)
  const endIso = sgDateToIsoEnd(end.value)
  if (!startIso || !endIso) {
    $q.notify({ type: 'warning', message: 'Date format should be dd/mm/yyyy' })
    return
  }
  const res = await store.submitLeave({ dateRange: { start: startIso, end: endIso }, reason: reason.value })
  if (res.queued) $q.notify({ type: 'info', message: 'Offline, added to queue' })
  else $q.notify({ type: res.ok ? 'positive' : 'negative', message: res.ok ? 'Leave request submitted' : res.error })
  start.value = ''
  end.value = ''
  reason.value = ''
}

function formatDate(iso) { try { return new Date(iso).toLocaleString() } catch { return iso } }
function rangeText(r) { return `${(r?.start || '').slice(0,10)} ~ ${(r?.end || '').slice(0,10)}` }
function badgeColor(st) { return st === 'present' ? 'positive' : st === 'late' ? 'warning' : 'negative' }

// Helpers for Singapore date format (dd/mm/yyyy) to ISO
function sgToParts(s) {
  if (typeof s !== 'string') return null
  const m = s.match(/^([0-3]\d)\/([0-1]\d)\/(\d{4})$/)
  if (!m) return null
  const dd = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  const yyyy = parseInt(m[3], 10)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  return { dd, mm, yyyy }
}
function sgDateToIsoStart(s) {
  const p = sgToParts(s)
  if (!p) return null
  return new Date(Date.UTC(p.yyyy, p.mm - 1, p.dd, 0, 0, 0)).toISOString()
}
function sgDateToIsoEnd(s) {
  const p = sgToParts(s)
  if (!p) return null
  return new Date(Date.UTC(p.yyyy, p.mm - 1, p.dd, 23, 59, 59)).toISOString()
}

// Basic input validation rules for QInput
const dateRules = [
  (v) => !v || /^([0-3]\d)\/([0-1]\d)\/(\d{4})$/.test(v) || 'Format dd/mm/yyyy'
]
</script>

<style scoped>
</style>
