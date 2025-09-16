/* eslint-env serviceworker */

/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'

self.skipWaiting()
clientsClaim()

// Use with precache injection
precacheAndRoute(self.__WB_MANIFEST)

cleanupOutdatedCaches()

// Handle navigation requests - fallback to index.html for offline support
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async () => {
    try {
      // 尝试从缓存中获取index.html
      const cachedResponse = await caches.match('index.html')
      if (cachedResponse) {
        return cachedResponse
      }

      // 尝试从缓存中获取根路径
      const rootResponse = await caches.match('/')
      if (rootResponse) {
        return rootResponse
      }

      // 最后尝试网络请求
      return await fetch('index.html')
    } catch (error) {
      console.error('Navigation fallback failed:', error)
      // 返回一个基本的HTML响应作为最后的回退
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>PwC PWA Demo - Offline</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <div id="q-app">
              <h1>应用正在离线模式下运行</h1>
              <p>请检查您的网络连接</p>
            </div>
          </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      )
    }
  },
)

// 缓存API请求 - 使用StaleWhileRevalidate策略
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
  }),
)

// 缓存静态资源 - 使用StaleWhileRevalidate策略来确保及时更新
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources-' + (new Date().toISOString().split('T')[0]),
  }),
)

// Cache attachments (e.g., announcement files) with CacheFirst
registerRoute(
  ({ url }) => url.pathname.includes('/attachments/') || /\.(?:pdf|png|jpg|jpeg|gif|doc|docx|ppt|pptx)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'attachments-cache',
  }),
)
self.addEventListener('push', function (event) {
  console.log('event', event)

  const data = event.data ? event.data.json() : {}
  const title = data.title || '新消息'
  const options = {
    body: data.body || '你有新的通知',
    icon: '/icons/icon-64x64.png',
    badge: '/icons/icon-64x64.png',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/'), // 点击通知后跳转首页
  )
})
