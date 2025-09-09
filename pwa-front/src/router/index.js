import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createWebHistory(),
  })

  // Add route guard
  Router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    const urlParams = new URLSearchParams(window.location.search)
    const hasLoginParams = urlParams.get('login') === 'success' && urlParams.get('token')

    // If accessing login page, allow directly
    if (to.path === '/login') {
      next()
      return
    }

    // If home page has login params (third-party login callback), allow access
    if (to.path === '/' && hasLoginParams) {
      next()
      return
    }

    // If no token, redirect to login page
    if (!token) {
      next('/login')
      return
    }

    // Has token, allow access
    next()
  })

  return Router
})
