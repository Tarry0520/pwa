import { api } from 'src/boot/axios'

// Subscribe to push notifications
export function subscribeToPush(subscription) {
  return api({
    url: '/push/subscribe',
    method: 'post',
    data: subscription,
  })
}

// Send push notification
export function sendPushNotification(data) {
  return api({
    url: '/push/send-all',
    method: 'post',
    data,
  })
}
