import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'
import { Notify } from 'quasar'
// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://byoxycpzeg.execute-api.ap-southeast-1.amazonaws.com'
})

// Add request interceptor to automatically carry token in request headers
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token')
    if (token) {
      // Add Authorization field to request headers
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add response interceptor to automatically extract response.data.data
api.interceptors.response.use(
  (response) => {
    // If response data has data field, directly return the content of data field
    // Otherwise return complete response data
    return response.data
  },
  (error) => {
    // Handle error response
    // If it's a 401 unauthorized error, clear token and redirect to login page
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // You can add routing logic to redirect to login page here
      // For example: window.location.href = '/login'
    }
    console.log('error', error)
    if (error.response?.data.success === false) {
      Notify.create({
        type: 'negative',
        message: error.response?.data?.message || 'System error',
        position: 'top',
      })
      return Promise.reject(error)
    }
    return Promise.reject(error)
  },
)

export default defineBoot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
})

export { api }
