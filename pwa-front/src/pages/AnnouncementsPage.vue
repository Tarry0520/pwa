<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Announcements</div>
      <q-space />
      <q-btn flat icon="refresh" label="Refresh" :loading="loading" @click="onRefresh" />
    </div>

    <div class="text-caption text-grey-7 q-mb-md">Last synced: <span>{{ lastSyncedText }}</span></div>

    <q-list separator>
      <q-item v-for="a in items" :key="a.id" clickable>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ a.title }}</q-item-label>
          <q-item-label caption>{{ formatDate(a.publishedAt) }}</q-item-label>
          <div class="q-mt-xs text-body2">{{ a.body }}</div>
          <div class="q-mt-xs row q-col-gutter-sm">
            <q-btn
              v-for="att in a.attachments || []"
              :key="att.key"
              dense
              outline
              color="primary"
              :label="att.name"
              :href="att.signedUrl || att.url"
              target="_blank"
              type="a"
            />
          </div>
        </q-item-section>
        <q-item-section side>
          <q-btn v-if="!a.read" color="primary" dense flat icon="done" @click.stop="onMarkRead(a.id)" />
          <q-icon v-else name="check_circle" color="positive" />
        </q-item-section>
      </q-item>
      <div v-if="!loading && items.length === 0" class="text-body2 text-grey-7 q-pa-md">No announcements</div>
    </q-list>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAnnouncementsStore } from 'src/stores/announcements'

const $q = useQuasar()
const store = useAnnouncementsStore()

const loading = computed(() => store.loading)
const items = computed(() => store.items)
const lastSyncedText = computed(() => (store.lastSyncedAt ? new Date(store.lastSyncedAt).toLocaleString() : 'Not synced yet'))

onMounted(async () => {
  await store.loadFromDb()
})

async function onRefresh() {
  const res = await store.sync({ force: true })
  $q.notify({ type: res.ok ? 'positive' : 'negative', message: res.ok ? 'Announcements synced' : res.error })
}

async function onMarkRead(id) {
  const res = await store.markRead(id)
  $q.notify({ type: res.ok ? 'positive' : 'negative', message: res.ok ? 'Marked as read' : res.error })
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}
</script>

<style scoped>
</style>

