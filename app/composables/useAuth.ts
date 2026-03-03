interface User {
  name: string
  email: string
  role: string
  userName: string
  profileImageUrl?: string
  gitHub?: string
  bio?: string
  emailVerified?: boolean
}

interface UpdateProfileRequest {
  email?: string | null
  password?: string | null
  name?: string | null
  userName?: string | null
  gitHub?: string | null
  profileImageUrl?: string | null
  bio?: string | null
}

interface UpdateProfileResponse {
  message: string
  email: string
  name: string
  userName: string
  gitHub: string
  profileImageUrl: string
  bio: string
}

interface LoginResponse {
  message: string
  role: string
  email: string
  name: string
  userName: string
  token: string
  profileImageUrl?: string
  emailVerified?: boolean
}

interface VerifyEmailResponse {
  message: string
  userName: string
  token: string
}

export function useAuth() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const userCookie = useCookie<User | null>('falae_user', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: true
  })

  const user = useState<User | null>('auth_user', () => userCookie.value)
  const isAuthenticated = computed(() => !!user.value)

  const login = async (email: string, password: string) => {
    const response = await $fetch<LoginResponse>(`${apiBase}/auth/author/login`, {
      method: 'POST',
      body: { email, password },
      credentials: 'include'
    })

    const userData: User = {
      name: response.name,
      email: response.email,
      role: response.role,
      userName: response.userName,
      profileImageUrl: response.profileImageUrl,
      emailVerified: response.emailVerified
    }

    user.value = userData
    userCookie.value = userData

    return true
  }

  const logout = async () => {
    try {
      await $fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (e) {

    }
    user.value = null
    userCookie.value = null
    navigateTo('/login')
  }

  const register = async (name: string, username: string, email: string, password: string) => {
    await $fetch(`${apiBase}/api/authors/create`, {
      method: 'POST',
      body: { name, userName: username, email, password },
      credentials: 'include'
    })

    return await login(email, password)
  }

  const loginWithGoogle = async (credential: string) => {
    const response = await $fetch<LoginResponse>(`${apiBase}/auth/google`, {
      method: 'POST',
      body: { credential },
      credentials: 'include'
    })

    const userData: User = {
      name: response.name,
      email: response.email,
      role: response.role,
      userName: response.userName,
      profileImageUrl: response.profileImageUrl,
      emailVerified: response.emailVerified
    }

    user.value = userData
    userCookie.value = userData

    return true
  }

  const validateToken = async () => {
    if (!isAuthenticated.value) return
    try {
      await $fetch(`${apiBase}/auth/validate`, {
        credentials: 'include'
      })
    } catch {
      user.value = null
      userCookie.value = null
    }
  }

  const updateProfile = async (data: UpdateProfileRequest) => {
    const response = await $fetch<UpdateProfileResponse>(`${apiBase}/api/authors/profile`, {
      method: 'PATCH',
      body: data,
      credentials: 'include'
    })

    const updatedUser: User = {
      ...user.value!,
      name: response.name,
      email: response.email,
      userName: response.userName,
      profileImageUrl: response.profileImageUrl || undefined,
      gitHub: response.gitHub || undefined,
      bio: response.bio || undefined
    }

    user.value = updatedUser
    userCookie.value = updatedUser

    return response
  }

  const verifyEmail = async (token: string) => {
    const response = await $fetch<VerifyEmailResponse>(`${apiBase}/auth/verify-email`, {
      params: { token },
      credentials: 'include'
    })

    if (user.value) {
      user.value = { ...user.value, emailVerified: true }
      userCookie.value = user.value
    }

    return response
  }

  const resendVerificationEmail = async (email: string) => {
    await $fetch(`${apiBase}/auth/resend-verification`, {
      method: 'POST',
      params: { email },
      credentials: 'include'
    })
  }

  const setEmailVerified = (verified: boolean) => {
    if (user.value) {
      user.value = { ...user.value, emailVerified: verified }
      userCookie.value = user.value
    }
  }

  return {
    user,
    isAuthenticated,
    login,
    loginWithGoogle,
    logout,
    register,
    validateToken,
    updateProfile,
    verifyEmail,
    resendVerificationEmail,
    setEmailVerified
  }
}
