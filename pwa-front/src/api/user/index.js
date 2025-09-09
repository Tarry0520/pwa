import { api } from 'src/boot/axios'
export function getMicrosoftUrl(query) {
  return api({
    url: '/sso/microsoft',
    method: 'get',
    query,
  })
}

export function registerUser(data) {
  return api({
    url: '/user/register',
    method: 'post',
    data,
  })
}

export function loginUser(data) {
  return api({
    url: '/user/login',
    method: 'post',
    data,
  })
}

// Get user information
export function getUserProfile() {
  return api({
    url: '/user/profile',
    method: 'get',
  })
}

// Update user information
export function updateUserProfile(data) {
  return api({
    url: '/user/profile',
    method: 'put',
    data,
  })
}

// Change password
export function changeUserPassword(data) {
  return api({
    url: '/user/password',
    method: 'put',
    data,
  })
}

// Upload avatar
export function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)
  return api({
    url: '/user/avatar',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
