<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex bg-image flex-center">
        <q-card v-bind:style="$q.screen.lt.sm ? { 'width': '80%' } : { 'width': '40%' }">
          <q-card-section>
            <q-avatar size="103px" class="absolute-center shadow-10">
              <img src="profile.svg">
            </q-avatar>
          </q-card-section>
          <q-card-section>
            <div class="text-center q-pt-lg">
              <div class="col text-h6 ellipsis">
                {{ isLoginMode ? 'Login' : 'Register' }}
              </div>
            </div>
          </q-card-section>
          <q-card-section>
            <q-form class="q-gutter-md" @submit="handleSubmit">
              <q-input v-if="isLoginMode" filled v-model="formData.identifier" label="Email/Student ID" lazy-rules
                :rules="[val => !!val || 'Please enter email/student ID']" :error="!!errors.identifier"
                :error-message="errors.identifier" />

              <q-input v-if="!isLoginMode" filled v-model="formData.email" label="Email" lazy-rules
                :rules="[val => !!val || 'Please enter email', val => /.+@.+\..+/.test(val) || 'Please enter a valid email address']"
                :error="!!errors.email" :error-message="errors.email" />

              <q-input type="password" filled v-model="formData.password" label="Password" lazy-rules
                :rules="[val => !!val || 'Please enter password', val => val.length >= 6 || 'Password must be at least 6 characters']"
                :error="!!errors.password" :error-message="errors.password" />

              <q-input v-if="!isLoginMode" type="password" filled v-model="formData.confirmPassword"
                label="Confirm Password" lazy-rules
                :rules="[val => !!val || 'Please confirm password', val => val === formData.password || 'Passwords do not match']"
                :error="!!errors.confirmPassword" :error-message="errors.confirmPassword" />



              <div class="q-mt-md row justify-center">
                <q-btn :label="isLoginMode ? 'Login' : 'Register'" type="submit" color="primary" :loading="loading"
                  class="full-width" />
              </div>

              <div class="text-center">
                <q-btn flat :label="isLoginMode ? 'No account? Click to register' : 'Have an account? Click to login'"
                  @click="toggleMode" color="primary" />
              </div>

              <q-separator class="q-my-md" />

              <div class="text-center">
                <q-btn label="Microsoft Login" type="button" color="primary" outline @click="loginWithMicrosoft"
                  class="full-width" icon="img:/microsoft-logo.svg">
                  <!-- <template v-slot:prepend>
                    <img src="microsoft-logo.svg" alt="Microsoft" style="width: 20px; height: 20px;" />
                  </template> -->
                </q-btn>
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from 'src/stores/user'
// import { getMicrosoftUrl } from 'src/api/user'

const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()

// Form data
const formData = reactive({
  identifier: '', // For login: email or student ID
  password: '',
  confirmPassword: '',
  email: ''
})

// Error messages
const errors = reactive({
  identifier: '',
  password: '',
  confirmPassword: '',
  email: ''
})

// State management
const isLoginMode = ref(true)
const loading = ref(false)

// Toggle login/register mode
function toggleMode() {
  isLoginMode.value = !isLoginMode.value
  clearForm()
  clearErrors()
}

// Clear form
function clearForm() {
  formData.identifier = ''
  formData.password = ''
  formData.confirmPassword = ''
  formData.email = ''
}

// Clear error messages
function clearErrors() {
  errors.identifier = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.email = ''
}

// Form validation
function validateForm() {
  clearErrors()
  let isValid = true

  // Login mode: validate email or student ID
  if (isLoginMode.value) {
    if (!formData.identifier.trim()) {
      errors.identifier = 'Please enter email/student ID'
      isValid = false
    }
  }

  // Password validation (required for both login and register)
  if (!formData.password) {
    errors.password = 'Please enter password'
    isValid = false
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
    isValid = false
  }

  // Register mode: validate confirm password and email
  if (!isLoginMode.value) {
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password'
      isValid = false
    } else if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = 'Passwords do not match'
      isValid = false
    }

    if (!formData.email.trim()) {
      errors.email = 'Please enter email'
      isValid = false
    } else if (!/.+@.+\..+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
      isValid = false
    }
  }

  return isValid
}

// Handle form submission
async function handleSubmit() {
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    if (isLoginMode.value) {
      // Login
      const result = await userStore.login({
        identifier: formData.identifier, // email or student ID
        password: formData.password
      })
      if (result.success) {
        $q.notify({
          type: 'positive',
          message: result.message || 'Login successful!',
          position: 'top'
        })
        router.push('/')
      } else {
        $q.notify({
          type: 'negative',
          message: result.error || 'Login failed',
          position: 'top'
        })
      }
    } else {
      // Register
      const result = await userStore.register({
        password: formData.password,
        email: formData.email
      })

      if (result.success) {
        $q.notify({
          type: 'positive',
          message: result.message || 'Registration successful! Please login',
          position: 'top'
        })
        isLoginMode.value = true
        clearForm()
      } else {
        $q.notify({
          type: 'negative',
          message: result.error || 'Registration failed',
          position: 'top'
        })
      }
    }
  } finally {
    loading.value = false
  }
}

// Microsoft third-party login
async function loginWithMicrosoft() {

  // const response = await getMicrosoftUrl()
  // if (response.data && response.data.url) {
  //   window.location.href = response.data.url
  // } else {
  //   // Backup solution
  //   window.location.href = 'https://quasar-api.handwx.cn:8083/sso/login'
  // }
  window.location.href = 'https://byoxycpzeg.execute-api.ap-southeast-1.amazonaws.com/sso/microsoft'

}

</script>

<style>
.bg-image {
  background-image: linear-gradient(135deg, #7028e4 0%, #e5b2ca 100%);
}
</style>
