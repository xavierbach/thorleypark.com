import type { Assignments, SavedPlan, Shape } from './types'

const PLANS_KEY = 'seating-planner:plans:v1'
const SESSION_KEY = 'seating-planner:session:v1'

export interface Session {
  guests: string[]
  shape: Shape
  seats: number
  title: string
  subtitle: string
  assignments: Assignments
  loadedPlanId: string | null
}

export function loadPlans(): SavedPlan[] | null {
  return readJSON<SavedPlan[]>(PLANS_KEY)
}

export function savePlans(plans: SavedPlan[]): void {
  writeJSON(PLANS_KEY, plans)
}

export function loadSession(): Session | null {
  return readJSON<Session>(SESSION_KEY)
}

export function saveSession(session: Session): void {
  writeJSON(SESSION_KEY, session)
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private mode, quota). The app still works
    // for the current session; nothing to do but carry on.
  }
}
