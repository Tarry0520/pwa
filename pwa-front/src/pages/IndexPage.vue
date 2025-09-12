<template>
  <q-page class="flex flex-center">
    <div class="text-center">
      <h3>Welcome PWA Demo App</h3>
      <div v-if="userStore.isLoggedIn" class="q-mt-md">
        <p>Welcome back, {{ userStore.currentUser?.name || userStore.currentUser?.email }}!</p>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from 'src/stores/user'
import { useQuasar } from 'quasar'

const userStore = useUserStore()
const $q = useQuasar()

// Get URL parameters
function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    token: params.get('token'),
    user: params.get('user'),
    login: params.get('login'),
    error: params.get('error')
  }
}

// Handle login success
function handleLoginSuccess() {
  const params = getUrlParams()

  if (params.login === 'success' && params.token && params.user) {
    try {
      // Parse user information
      const userData = JSON.parse(decodeURIComponent(params.user))

      // Store to LocalStorage
      localStorage.setItem('authToken', params.token)
      localStorage.setItem('userData', JSON.stringify(userData))

      // Update store state
      userStore.setAuthData(params.token, userData)

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)

      // Show success message
      $q.notify({
        type: 'positive',
        message: 'Microsoft login successful!',
        position: 'top'
      })

      // Show user interface
      showUserInterface(userData)

    } catch (error) {
      console.error('Failed to parse user data:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to parse login data',
        position: 'top'
      })
    }
  } else if (params.error) {
    // Handle login error
    $q.notify({
      type: 'negative',
      message: `Login failed: ${decodeURIComponent(params.error)}`,
      position: 'top'
    })

    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

// Show user interface
function showUserInterface(userData) {
  console.log('User login successful:', userData)
  // Here you can add more user interface related logic
}

// Check URL parameters when page loads
onMounted(() => {
  handleLoginSuccess()
})
</script>
