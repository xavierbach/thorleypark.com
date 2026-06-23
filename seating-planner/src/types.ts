export type Shape = 'rectangle' | 'square' | 'round'

export interface SavedPlan {
  id: string
  name: string
  shape: Shape
  seats: number
  title: string
  subtitle: string
  /** seat index (as a string key) -> guest name */
  assignments: Record<string, string>
}

export interface DesignColors {
  room: string
  linen: string
  card: string
  cardText: string
  accent: string
  runner: string
  chip: string
  chipText: string
  muted: string
}

export interface SeatingConfig {
  format?: string
  version?: number
  event: { title: string; subtitle: string }
  table: { shape: Shape; seats: number }
  constraints: { shapes: Shape[]; seats: { min: number; max: number } }
  guests: string[]
  savedPlans: SavedPlan[]
  design: { colors: DesignColors; fonts: { display: string; body: string } }
}

/** The single item currently picked up, if any. */
export type Lifted =
  | { kind: 'roster'; name: string }
  | { kind: 'seat'; index: number }
  | null

/** Seat assignments held in app state, keyed by numeric seat index. */
export type Assignments = Record<number, string>
