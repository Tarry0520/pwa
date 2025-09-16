<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <!-- User avatar and basic info card -->
        <q-card class="q-mb-md">
          <q-card-section class="text-center">
            <q-avatar size="120px" class="q-mb-md">
              <img :src="userInfo.avatar || 'profile.svg'" />
            </q-avatar>
            <div class="text-h5 q-mb-sm">Student ID: {{ userInfo.studentId }}</div>
            <div class="text-grey-6">{{ userInfo.email }}</div>
            <div class="text-caption text-grey-5 q-mt-xs">
              Registration Date: {{ formatDate(userInfo.createdAt) }}
            </div>
          </q-card-section>
        </q-card>

        <!-- User info edit card -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Personal Information</div>
            <q-form @submit="updateProfile" class="q-gutter-md">
              <q-input v-model="editForm.displayName" label="Username" filled lazy-rules
                :rules="[val => !!val || 'Please enter username']" :error="!!errors.displayName"
                :error-message="errors.displayName" />

              <q-input v-model="editForm.email" label="Email" filled type="email" readonly lazy-rules
                :error="!!errors.email" :error-message="errors.email" />

              <q-input v-model="editForm.phone" label="Phone Number" filled lazy-rules :error="!!errors.phone"
                :error-message="errors.phone" />

              <div class="row q-gutter-sm">
                <q-btn type="submit" color="primary" label="Save Changes" :loading="profileLoading" class="col" />
                <q-btn color="grey" label="Reset" @click="resetForm" class="col" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Change password card -->
        <q-card class="q-mb-md" v-if="userInfo.provider !== 'microsoft'">
          <q-card-section>
            <div class="text-h6 q-mb-md">Change Password</div>
            <q-form class="q-gutter-md">
              <q-input v-model="passwordForm.oldPassword" label="Current Password" filled type="password" lazy-rules
                :rules="[val => !!val || 'Please enter current password']" :error="!!errors.oldPassword"
                :error-message="errors.oldPassword" />

              <q-input v-model="passwordForm.newPassword" label="New Password" filled type="password" lazy-rules
                :rules="[val => !!val || 'Please enter new password', val => val.length >= 6 || 'Password must be at least 6 characters']"
                :error="!!errors.newPassword" :error-message="errors.newPassword" />

              <q-input v-model="passwordForm.confirmPassword" label="Confirm New Password" filled type="password"
                lazy-rules
                :rules="[val => !!val || 'Please confirm new password', val => val === passwordForm.newPassword || 'Passwords do not match']"
                :error="!!errors.confirmPassword" :error-message="errors.confirmPassword" />


            </q-form>
            <q-btn type="submit" color="primary" label="Change Password" :loading="passwordLoading" class="full-width"
              @click="changePassword" />
          </q-card-section>
        </q-card>

        <!-- Account settings card -->
        <q-card style="display: none;">
          <q-card-section>
            <div class="text-h6 q-mb-md">Account Settings</div>
            <div class="q-gutter-md">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-subtitle2">Email Notifications</div>
                  <div class="text-caption text-grey-6">Receive important notifications and updates</div>
                </div>
                <q-toggle v-model="settings.emailNotifications" />
              </div>

              <q-separator />

              <div class="row items-center justify-between">
                <div>
                  <div class="text-subtitle2">SMS Notifications</div>
                  <div class="text-caption text-grey-6">Receive SMS reminders</div>
                </div>
                <q-toggle v-model="settings.smsNotifications" />
              </div>

              <q-separator />

              <div class="row items-center justify-between">
                <div>
                  <div class="text-subtitle2">Auto Login</div>
                  <div class="text-caption text-grey-6">Keep login status</div>
                </div>
                <q-toggle v-model="settings.autoLogin" />
              </div>

              <div class="q-mt-md">
                <q-btn color="primary" label="Save Settings" @click="saveSettings" :loading="settingsLoading"
                  class="full-width" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useUserStore } from 'src/stores/user'
import { getUserProfile, updateUserProfile, changeUserPassword } from 'src/api/user'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

// User information
const userInfo = ref({
  displayName: '',
  email: '',
  phone: '',
  avatar: '',
  createdAt: '',
  provider: ''
})

// Edit form
const editForm = reactive({
  displayName: '',
  email: '',
  phone: ''
})

// Password form
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Settings
const settings = reactive({
  emailNotifications: true,
  smsNotifications: false,
  autoLogin: true
})

// Error messages
const errors = reactive({
  displayName: '',
  email: '',
  phone: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Loading states
const profileLoading = ref(false)
const passwordLoading = ref(false)
const settingsLoading = ref(false)

// Format date
function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Clear error messages
function clearErrors() {
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })
}

// Reset edit form
function resetForm() {
  editForm.displayName = userInfo.value.displayName || ''
  editForm.email = userInfo.value.email || ''
  editForm.phone = userInfo.value.phone || ''
  clearErrors()
}

// Update user profile
async function updateProfile() {
  clearErrors()
  profileLoading.value = true

  try {
    const result = await updateUserProfile(editForm)
    if (result.success) {
      // Update local user info
      userInfo.value = { ...userInfo.value, ...editForm }
      userStore.user = { ...userStore.user, ...editForm }
      localStorage.setItem('user', JSON.stringify(userStore.user))

      // Reset form state to avoid triggering validation
      resetForm()

      $q.notify({
        type: 'positive',
        message: 'Personal information updated successfully',
        position: 'top'
      })
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Update failed',
        position: 'top'
      })
    }
  } finally {
    profileLoading.value = false
  }
}

// Change password
async function changePassword() {
  clearErrors()
  passwordLoading.value = true

  try {
    const result = await changeUserPassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Password changed successfully, please login again',
        position: 'top'
      })

      // Clear user information
      userStore.logout()

      // Delay redirect to login page to let user see success message
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Password change failed',
        position: 'top'
      })
    }
  } finally {
    passwordLoading.value = false
  }
}

// Save settings
async function saveSettings() {
  settingsLoading.value = true

  try {
    // Here you can call API to save settings
    // await saveUserSettings(settings)

    $q.notify({
      type: 'positive',
      message: 'Settings saved successfully',
      position: 'top'
    })
  } finally {
    settingsLoading.value = false
  }
}

// Load user information
async function loadUserProfile() {
  try {
    // First get user info from store
    if (userStore.currentUser) {
      userInfo.value = { ...userStore.currentUser }
      resetForm()
    }

    // Then get latest info from API
    const result = await getUserProfile()
    if (result.success && result.data) {
      userInfo.value = { ...userInfo.value, ...result.data }
      resetForm()
    }
  } catch (error) {
    console.error('Load user profile error:', error)
    // If API call fails, at least show info from store
    if (userStore.currentUser) {
      userInfo.value = { ...userStore.currentUser }
      resetForm()
    }
  }
}

// Load user information when component mounts

loadUserProfile()

</script>

<style scoped>
.q-card {
  border-radius: 12px;
}

.q-avatar {
  border: 3px solid #e0e0e0;
}
</style>
