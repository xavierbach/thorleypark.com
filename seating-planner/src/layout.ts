import type { Shape } from './types'

/** A seat position as a percentage of the stage box, plus an optional label. */
export interface SeatPos {
  x: number
  y: number
  label?: string
}

/** Geometry of the table surface, as percentages of the stage box. */
export interface TableGeom {
  left: number
  top: number
  width: number
  height: number
  radius: number // border-radius as a percentage of the smaller side
}

/**
 * Compute seat positions for a given shape and seat count. One index space
 * 0..seats-1, ordered clockwise from the top. Coordinates are percentages of
 * the stage so any shape and count scales cleanly.
 */
export function computeSeats(shape: Shape, seats: number): SeatPos[] {
  switch (shape) {
    case 'rectangle':
      return rectangle(seats)
    case 'square':
      return square(seats)
    case 'round':
      return round(seats)
  }
}

export function tableGeom(shape: Shape): TableGeom {
  switch (shape) {
    case 'rectangle':
      return { left: 35, top: 16, width: 30, height: 68, radius: 22 }
    case 'square':
      return { left: 28, top: 28, width: 44, height: 44, radius: 12 }
    case 'round':
      return { left: 26, top: 26, width: 48, height: 48, radius: 50 }
  }
}

function rectangle(seats: number): SeatPos[] {
  const ends = seats >= 6 ? 2 : 0
  const remaining = seats - ends
  const right = Math.ceil(remaining / 2)
  const left = remaining - right

  const xRight = 73
  const xLeft = 27
  const cx = 50
  const innerTop = 22
  const innerBottom = 78
  const span = innerBottom - innerTop

  const pos: SeatPos[] = []
  if (ends) pos.push({ x: cx, y: 9, label: 'Head' })
  for (let i = 0; i < right; i++) {
    const t = right === 1 ? 0.5 : (i + 0.5) / right
    pos.push({ x: xRight, y: innerTop + t * span })
  }
  if (ends) pos.push({ x: cx, y: 91, label: 'Foot' })
  for (let i = 0; i < left; i++) {
    const t = left === 1 ? 0.5 : (i + 0.5) / left
    pos.push({ x: xLeft, y: innerBottom - t * span })
  }
  return pos
}

function square(seats: number): SeatPos[] {
  const base = Math.floor(seats / 4)
  const extra = seats % 4
  // Give one extra seat to sides in the order top, right, bottom, left.
  const counts = [base, base, base, base]
  for (let k = 0; k < extra; k++) counts[k]++
  const [top, rightN, bottom, leftN] = counts

  const start = 30
  const end = 70
  const lineGeom = (i: number, n: number) => (i + 0.5) / n
  const along = (f: number) => start + f * (end - start)

  const pos: SeatPos[] = []
  // top: left -> right
  for (let i = 0; i < top; i++) pos.push({ x: along(lineGeom(i, top)), y: 18 })
  // right: top -> bottom
  for (let i = 0; i < rightN; i++) pos.push({ x: 82, y: along(lineGeom(i, rightN)) })
  // bottom: right -> left
  for (let i = 0; i < bottom; i++) pos.push({ x: along(1 - lineGeom(i, bottom)), y: 82 })
  // left: bottom -> top
  for (let i = 0; i < leftN; i++) pos.push({ x: 18, y: along(1 - lineGeom(i, leftN)) })
  return pos
}

function round(seats: number): SeatPos[] {
  const cx = 50
  const cy = 50
  const r = 40
  const pos: SeatPos[] = []
  for (let i = 0; i < seats; i++) {
    const angle = ((-90 + i * (360 / seats)) * Math.PI) / 180
    pos.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
  }
  return pos
}

/**
 * Collect seated guests in seat-index order and refill the new seat count from
 * index 0 in that same order. Guests that no longer fit are simply absent from
 * the result, which returns them to the roster (they are never lost).
 */
export function reflow(
  prev: Record<number, string>,
  prevSeats: number,
  nextSeats: number,
): Record<number, string> {
  const ordered: string[] = []
  for (let i = 0; i < prevSeats; i++) {
    const name = prev[i]
    if (name) ordered.push(name)
  }
  const next: Record<number, string> = {}
  for (let i = 0; i < nextSeats && i < ordered.length; i++) {
    next[i] = ordered[i]
  }
  return next
}

/**
 * A per-seat scale factor that keeps place cards from colliding as the count
 * grows. Tuned per shape against how many seats share the tightest edge/ring.
 */
export function cardScale(shape: Shape, seats: number): number {
  let tightest: number
  if (shape === 'round') {
    tightest = seats
    return clamp(0.52, 1, 17 / tightest)
  }
  if (shape === 'square') {
    tightest = Math.ceil(seats / 4)
  } else {
    const ends = seats >= 6 ? 2 : 0
    tightest = Math.ceil((seats - ends) / 2)
  }
  return clamp(0.6, 1, 8 / tightest)
}

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v))
}
