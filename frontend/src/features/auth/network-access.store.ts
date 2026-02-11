type NetworkAccessState = {
  isNetworkDenied: boolean
}

let state: NetworkAccessState = { isNetworkDenied: false }
const listeners = new Set<() => void>()

export function getNetworkAccessState(): NetworkAccessState {
  return state
}

export function subscribeNetworkAccess(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setNetworkDenied(isNetworkDenied: boolean): void {
  if (state.isNetworkDenied === isNetworkDenied) return
  state = { ...state, isNetworkDenied }
  for (const listener of listeners) listener()
}

/** Reset helper for tests (and for explicit retry flows). */
export function resetNetworkAccess(): void {
  setNetworkDenied(false)
}

