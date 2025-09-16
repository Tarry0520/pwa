const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: '/subscription', component: () => import('pages/SubscriptionPage.vue') },
      { path: '/profile', component: () => import('pages/UserProfilePage.vue') },
      { path: '/transcript', component: () => import('pages/TranscriptPage.vue') },
      { path: '/schedule', component: () => import('pages/SchedulePage.vue') },
      { path: '/announcements', component: () => import('pages/AnnouncementsPage.vue') },
    ],
  },
  {
    path: '/login',
    component: () => import('pages/loginPage.vue'),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
