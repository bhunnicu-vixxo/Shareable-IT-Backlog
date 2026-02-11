export interface User {
  id: number
  email: string
  displayName: string | null
  isAdmin: boolean
  isApproved: boolean
  isDisabled: boolean
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isIdentified: boolean
  error: string | null
}
