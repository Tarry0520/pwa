<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from 'src/stores/user'

const userStore = useUserStore()

// Initialize authentication state when app starts
onMounted(() => {
  userStore.initializeAuth()
})
</script>
