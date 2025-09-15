<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> PwC PWA demo App </q-toolbar-title>

        <!-- <div> v{{ $q.version }}</div> -->
        <div class="row items-center q-gutter-sm">
          <q-btn v-if="userStore.currentUser" flat dense no-caps @click="goToProfile" class="text-white">
            <q-avatar size="32px" class="q-mr-sm">
              <img :src="userStore.currentUser.avatar || 'profile.svg'" />
            </q-avatar>
            <!-- <span class="text-caption">
              Welcome, {{ userStore.currentUser.email }}
            </span> -->
          </q-btn>
          <q-btn v-if="userStore.isLoggedIn" flat dense round icon="logout" @click="handleLogout" aria-label="Logout" />
          <!-- <span class="text-caption">v1.0.0</span> -->
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item to="/" active-class="q-item-no-link-highlighting">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Home</q-item-label>
          </q-item-section>
        </q-item>
        <q-item to="/transcript" active-class="q-item-no-link-highlighting">
          <q-item-section avatar>
            <q-icon name="assignment" />
          </q-item-section>
          <q-item-section>
            <q-item-label>成績單</q-item-label>
          </q-item-section>
        </q-item>
        <q-item to="/subscription" active-class="q-item-no-link-highlighting">
          <q-item-section avatar>
            <q-icon name="notification_add" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Subscription</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from 'src/stores/user'

const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function goToProfile() {
  router.push('/profile')
}

function handleLogout() {
  $q.dialog({
    title: 'Confirm Logout',
    message: 'Are you sure you want to logout?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    userStore.logout()
    $q.notify({
      type: 'positive',
      message: 'Successfully logged out',
      position: 'top'
    })
    router.push('/login')
  })
}
</script>
