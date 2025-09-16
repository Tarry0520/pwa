<template>
  <q-page padding class="column items-center">
    <q-btn label="Subscription" color="primary" class="q-mb-md" @click="subscribeToPush" />

    <q-input v-model="title" label="Title" filled class="q-mb-lg" style="width: 40%;" />
    <q-input v-model="body" label="Content" filled class="q-mb-lg" style="width: 40%;" />

    <q-btn label="Push" color="secondary" @click="sendPush" />
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { subscribeToPush as apiSubscribeToPush, sendPushNotification } from 'src/api/subscription'

const $q = useQuasar()
const title = ref('')
const body = ref('')

// URL-safe Base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// Click subscribe button
const subscribeToPush = async () => {
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      console.log('通知权限已授权')
    }
    if (permission !== 'granted') {
      $q.notify({ type: 'negative', message: 'Notification permission not granted' })
      return
    }


    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BOJvBId6mQHxPsNTKP9HNj6It8SVxo0Q4epoj30zLHix3gbRwu8mprXMTB-Z3RfKFaiE1BPykqD6yfu0XKumgoA'
      )
    })

    console.log('Subscription object:', subscription)

    await apiSubscribeToPush(subscription)
    $q.notify({ type: 'positive', message: 'Subscription successful!' })
  } catch (err) {
    console.error('Subscription failed:', err)
    $q.notify({ type: 'negative', message: 'Subscription failed, please check console' })
  }
}

// Click send push button
const sendPush = async () => {
  if (!title.value || !body.value) {
    $q.notify({ type: 'warning', message: 'Please enter title and content' })
    return
  }

  try {
    await sendPushNotification({ title: title.value, body: body.value })
    $q.notify({ type: 'positive', message: 'Push notification sent successfully!' })
  } catch (err) {
    console.error('Push failed:', err)
    $q.notify({ type: 'negative', message: 'Push failed, please check console' })
  }
}
</script>
