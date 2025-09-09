import { defineStore } from 'pinia'
import { loginUser, registerUser } from 'src/api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated,
    currentUser: (state) => state.user,
  },

  actions: {
    async login(credentials) {
      const response = await loginUser(credentials)
      if (response.data && response.data.token) {
        this.token = response.data.token
        this.user = response.data.user
        this.isAuthenticated = true
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        return { success: true, data: response.data }
      }
      return { success: false, error: 'Login failed' }
    },

    async register(userData) {
      const response = await registerUser(userData)
      if (response.data) {
        return { success: true, data: response.data }
      }
      return { success: false, error: 'Registration failed' }
    },

    logout() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    initializeAuth() {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        this.token = token
        this.user = JSON.parse(user)
        this.isAuthenticated = true
      } else {
        // If no token or user info, clear state
        this.token = null
        this.user = null
        this.isAuthenticated = false
      }
    },

    // Check if token is valid
    checkAuth() {
      const token = localStorage.getItem('token')
      if (!token) {
        this.logout()
        return false
      }
      return true
    },

    // Set auth data (for third-party login callback)
    setAuthData(token, userData) {
      this.token = token
      this.user = userData
      this.isAuthenticated = true
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
    },
  },
})
