import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import defaultConfig from '../seating-config.json'
import type {
  Assignments,
  Lifted,
  SavedPlan,
  SeatingConfig,
  Shape,
} from './types'
import { cardScale, computeSeats, reflow, tableGeom } from './layout'
import {
  loadPlans,
  loadSession,
  savePlans as persistPlans,
  saveSession,
} from './storage'

const config = defaultConfig as SeatingConfig
const colors = config.design.colors

// ---- small helpers --------------------------------------------------------

function toStringKeys(a: Assignments): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of Object.keys(a)) out[k] = a[Number(k)]
  return out
}

function toNumberKeys(r: Record<string, string>): Assignments {
  const out: Assignments = {}
  for (const k of Object.keys(r)) out[Number(k)] = r[k]
  return out
}

function newId(): string {
  return 'plan-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

function sameAssignments(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k) => a[k] === b[k])
}

function download(filename: string, dataUrl: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'seating-plan'
  )
}

// ---- app ------------------------------------------------------------------

export default function App() {
  const session = useMemo(() => loadSession(), [])

  const [guests, setGuests] = useState<string[]>(() => session?.guests ?? config.guests)
  const [shape, setShape] = useState<Shape>(() => session?.shape ?? config.table.shape)
  const [seats, setSeats] = useState<number>(() => session?.seats ?? config.table.seats)
  const [title, setTitle] = useState<string>(() => session?.title ?? config.event.title)
  const [subtitle, setSubtitle] = useState<string>(
    () => session?.subtitle ?? config.event.subtitle,
  )
  const [assignments, setAssignments] = useState<Assignments>(
    () => session?.assignments ?? {},
  )
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(
    () => loadPlans() ?? config.savedPlans,
  )
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(
    () => session?.loadedPlanId ?? null,
  )

  const [lifted, setLifted] = useState<Lifted>(null)
  const [planName, setPlanName] = useState('')
  const [newGuest, setNewGuest] = useState('')
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  const captureRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Persist saved plans and the working session so a reload picks up where the
  // person left off.
  useEffect(() => {
    persistPlans(savedPlans)
  }, [savedPlans])

  useEffect(() => {
    saveSession({ guests, shape, seats, title, subtitle, assignments, loadedPlanId })
  }, [guests, shape, seats, title, subtitle, assignments, loadedPlanId])

  // Apply the design tokens as CSS variables once.
  useEffect(() => {
    const root = document.documentElement
    for (const [name, value] of Object.entries(colors)) {
      root.style.setProperty(`--c-${name}`, value)
    }
  }, [])

  const seatedNames = useMemo(() => new Set(Object.values(assignments)), [assignments])
  const roster = useMemo(
    () => guests.filter((g) => !seatedNames.has(g)),
    [guests, seatedNames],
  )
  const seatPositions = useMemo(() => computeSeats(shape, seats), [shape, seats])
  const geom = useMemo(() => tableGeom(shape), [shape])
  const scale = useMemo(() => cardScale(shape, seats), [shape, seats])

  const filledCount = Object.keys(assignments).length

  const loadedPlan = useMemo(
    () => savedPlans.find((p) => p.id === loadedPlanId) ?? null,
    [savedPlans, loadedPlanId],
  )

  const isDirty = useMemo(() => {
    if (!loadedPlan) return false
    return (
      loadedPlan.shape !== shape ||
      loadedPlan.seats !== seats ||
      loadedPlan.title !== title ||
      loadedPlan.subtitle !== subtitle ||
      !sameAssignments(loadedPlan.assignments, toStringKeys(assignments))
    )
  }, [loadedPlan, shape, seats, title, subtitle, assignments])

  const flash = useCallback((kind: 'info' | 'error', text: string) => {
    setNotice({ kind, text })
  }, [])

  // ---- arranging by tapping ----------------------------------------------

  function onRosterTap(name: string) {
    if (!lifted) {
      setLifted({ kind: 'roster', name })
      return
    }
    if (lifted.kind === 'roster') {
      setLifted(lifted.name === name ? null : { kind: 'roster', name })
      return
    }
    // Holding a seated guest: swap that guest into the roster and this name
    // onto the table.
    const idx = lifted.index
    setAssignments((a) => ({ ...a, [idx]: name }))
    setLifted(null)
  }

  function onSeatTap(index: number) {
    const occupant = assignments[index]

    if (!lifted) {
      if (occupant) setLifted({ kind: 'seat', index })
      return
    }

    if (lifted.kind === 'roster') {
      const name = lifted.name
      setAssignments((a) => ({ ...a, [index]: name }))
      setLifted(null)
      return
    }

    // Holding another seat.
    const from = lifted.index
    if (from === index) {
      setLifted(null)
      return
    }
    setAssignments((a) => {
      const next = { ...a }
      const moving = a[from]
      const dest = a[index]
      if (dest !== undefined) next[from] = dest
      else delete next[from]
      next[index] = moving
      return next
    })
    setLifted(null)
  }

  function onGuestsBarTap(e: React.MouseEvent<HTMLDivElement>) {
    // Only react to taps on the empty area of the bar, not on a chip.
    if (e.target !== e.currentTarget) return
    if (!lifted) return
    if (lifted.kind === 'seat') {
      const from = lifted.index
      setAssignments((a) => {
        const next = { ...a }
        delete next[from]
        return next
      })
    }
    setLifted(null)
  }

  // ---- table setup --------------------------------------------------------

  function changeShape(next: Shape) {
    if (next === shape) return
    setAssignments((a) => reflow(a, seats, seats))
    setShape(next)
    setLifted(null)
  }

  function changeSeats(next: number) {
    const min = config.constraints.seats.min
    const max = config.constraints.seats.max
    const clamped = Math.max(min, Math.min(max, next))
    if (clamped === seats) return
    setAssignments((a) => reflow(a, seats, clamped))
    setSeats(clamped)
    setLifted(null)
  }

  // ---- guest list editing -------------------------------------------------

  function addGuest() {
    const name = newGuest.trim()
    if (!name) return
    if (guests.some((g) => g.toLowerCase() === name.toLowerCase())) {
      flash('error', `${name} is already on the list.`)
      return
    }
    setGuests((g) => [...g, name])
    setNewGuest('')
  }

  function renameGuest(oldName: string, raw: string) {
    const name = raw.trim()
    if (!name || name === oldName) return
    if (guests.some((g) => g.toLowerCase() === name.toLowerCase() && g !== oldName)) {
      flash('error', `${name} is already on the list.`)
      return
    }
    setGuests((g) => g.map((x) => (x === oldName ? name : x)))
    setAssignments((a) => {
      const next: Assignments = {}
      for (const k of Object.keys(a)) {
        const i = Number(k)
        next[i] = a[i] === oldName ? name : a[i]
      }
      return next
    })
    setLifted((l) => (l && l.kind === 'roster' && l.name === oldName ? { kind: 'roster', name } : l))
  }

  function removeGuest(name: string) {
    setGuests((g) => g.filter((x) => x !== name))
    setAssignments((a) => {
      const next: Assignments = {}
      for (const k of Object.keys(a)) {
        const i = Number(k)
        if (a[i] !== name) next[i] = a[i]
      }
      return next
    })
    setLifted((l) =>
      l && ((l.kind === 'roster' && l.name === name) || l.kind === 'seat') ? null : l,
    )
  }

  // ---- saved plans --------------------------------------------------------

  function saveNewPlan() {
    const name = planName.trim()
    if (!name) {
      flash('error', 'Give the plan a name before saving it.')
      return
    }
    const plan: SavedPlan = {
      id: newId(),
      name,
      shape,
      seats,
      title,
      subtitle,
      assignments: toStringKeys(assignments),
    }
    setSavedPlans((p) => [...p, plan])
    setLoadedPlanId(plan.id)
    setPlanName('')
    flash('info', `Saved “${name}”.`)
  }

  function updateLoadedPlan() {
    if (!loadedPlan) return
    setSavedPlans((p) =>
      p.map((pl) =>
        pl.id === loadedPlan.id
          ? { ...pl, shape, seats, title, subtitle, assignments: toStringKeys(assignments) }
          : pl,
      ),
    )
    flash('info', `Updated “${loadedPlan.name}”.`)
  }

  function loadPlan(plan: SavedPlan) {
    // Make sure every assigned guest exists on the list so nobody is lost.
    const assignedNames = Object.values(plan.assignments)
    setGuests((g) => {
      const have = new Set(g)
      const merged = [...g]
      for (const n of assignedNames) {
        if (!have.has(n)) {
          merged.push(n)
          have.add(n)
        }
      }
      return merged
    })
    setShape(plan.shape)
    setSeats(plan.seats)
    setTitle(plan.title)
    setSubtitle(plan.subtitle)
    setAssignments(toNumberKeys(plan.assignments))
    setLoadedPlanId(plan.id)
    setLifted(null)
    flash('info', `Loaded “${plan.name}”.`)
  }

  function deletePlan(plan: SavedPlan) {
    setSavedPlans((p) => p.filter((pl) => pl.id !== plan.id))
    if (loadedPlanId === plan.id) setLoadedPlanId(null)
  }

  // ---- import / export ----------------------------------------------------

  function exportConfig() {
    const data: SeatingConfig = {
      format: 'seating-planner-config',
      version: 1,
      event: { title, subtitle },
      table: { shape, seats },
      constraints: config.constraints,
      guests,
      savedPlans,
      design: config.design,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    download(`${slug(title)}-config.json`, URL.createObjectURL(blob))
  }

  function importConfig(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<SeatingConfig>
        if (!parsed || !Array.isArray(parsed.guests) || !parsed.table || !parsed.event) {
          throw new Error('shape')
        }
        setGuests(parsed.guests)
        setShape(parsed.table.shape)
        setSeats(parsed.table.seats)
        setTitle(parsed.event.title)
        setSubtitle(parsed.event.subtitle)
        setSavedPlans(Array.isArray(parsed.savedPlans) ? parsed.savedPlans : [])
        setAssignments({})
        setLoadedPlanId(null)
        setLifted(null)
        flash('info', 'Imported the file. Pick a saved plan to put guests on the table.')
      } catch {
        flash('error', "That file isn't a seating planner export. Choose a .json you exported here.")
      }
    }
    reader.onerror = () => flash('error', "Couldn't read that file. Try again.")
    reader.readAsText(file)
  }

  async function downloadImage() {
    const node = captureRef.current
    if (!node) return
    setExporting(true)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: colors.room,
      })
      download(`${slug(title)}.png`, dataUrl)
    } catch {
      flash('error', "Couldn't make the image. Take a normal screenshot instead.")
    } finally {
      setExporting(false)
    }
  }

  // ---- render -------------------------------------------------------------

  const liftedName =
    lifted?.kind === 'roster'
      ? lifted.name
      : lifted?.kind === 'seat'
        ? assignments[lifted.index]
        : null

  return (
    <div className="app">
      <header className="app-bar">
        <span className="app-bar-title">Seating planner</span>
        {liftedName && (
          <span className="app-bar-hint" role="status">
            Holding <strong>{liftedName}</strong> — tap a seat to place them.
          </span>
        )}
      </header>

      <main className="layout">
        {/* Setup controls — kept above the table, outside the capture region. */}
        <section className="panel" aria-label="Table setup">
          <div className="panel-head">
            <h2>Table</h2>
          </div>
          <div className="field">
            <span className="field-label">Shape</span>
            <div className="segmented" role="group" aria-label="Table shape">
              {config.constraints.shapes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`seg ${shape === s ? 'seg-on' : ''}`}
                  onClick={() => changeShape(s)}
                  aria-pressed={shape === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label" id="seats-label">
              Seats
            </span>
            <div className="stepper" role="group" aria-labelledby="seats-label">
              <button
                type="button"
                onClick={() => changeSeats(seats - 1)}
                disabled={seats <= config.constraints.seats.min}
                aria-label="Remove a seat"
              >
                −
              </button>
              <span className="stepper-value" aria-live="polite">
                {seats}
              </span>
              <button
                type="button"
                onClick={() => changeSeats(seats + 1)}
                disabled={seats >= config.constraints.seats.max}
                aria-label="Add a seat"
              >
                +
              </button>
            </div>
          </div>
        </section>

        {/* Capture region: header + table only, no buttons. */}
        <div className="capture" ref={captureRef}>
          <div className="event-header">
            <input
              className="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Event title"
              placeholder="Event title"
            />
            <input
              className="event-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              aria-label="Event subtitle"
              placeholder="Add a subtitle"
            />
          </div>

          <div
            className={`stage stage-${shape}`}
            style={{ ['--card-scale' as string]: scale }}
            role="group"
            aria-label="Table layout"
          >
            <div
              className="table-surface"
              style={{
                left: `${geom.left}%`,
                top: `${geom.top}%`,
                width: `${geom.width}%`,
                height: `${geom.height}%`,
                borderRadius: shape === 'round' ? '50%' : `${geom.radius}px`,
              }}
            >
              <div className={`runner runner-${shape}`} />
            </div>

            {seatPositions.map((pos, index) => {
              const occupant = assignments[index]
              const isLifted = lifted?.kind === 'seat' && lifted.index === index
              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    'seat',
                    occupant ? 'seat-filled' : 'seat-empty',
                    isLifted ? 'seat-lifted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => onSeatTap(index)}
                  aria-label={
                    occupant
                      ? `Seat ${index + 1}${pos.label ? ` (${pos.label})` : ''}: ${occupant}`
                      : `Seat ${index + 1}${pos.label ? ` (${pos.label})` : ''}: empty`
                  }
                  aria-pressed={isLifted}
                >
                  {pos.label && <span className="seat-label">{pos.label}</span>}
                  {occupant ? (
                    <span className="seat-name">{occupant}</span>
                  ) : (
                    <span className="seat-plus" aria-hidden="true">
                      +
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Guests bar — tap targets, outside the capture region. */}
        <section className="panel guests-panel" aria-label="Guests not yet seated">
          <div className="panel-head">
            <h2>Guests</h2>
            <span className="muted">
              {filledCount} of {seats} seats filled
            </span>
          </div>
          <div className="guests-bar" onClick={onGuestsBarTap}>
            {roster.length === 0 ? (
              <p className="empty-line">
                {guests.length === 0
                  ? 'No guests yet. Add some below.'
                  : 'Everyone has a seat.'}
              </p>
            ) : (
              roster.map((name) => {
                const isLifted = lifted?.kind === 'roster' && lifted.name === name
                return (
                  <button
                    key={name}
                    type="button"
                    className={`chip ${isLifted ? 'chip-lifted' : ''}`}
                    onClick={() => onRosterTap(name)}
                    aria-pressed={isLifted}
                  >
                    {name}
                  </button>
                )
              })
            )}
          </div>
          {lifted?.kind === 'seat' && (
            <p className="hint">Tap here to send {liftedName} back to the guest list.</p>
          )}
        </section>

        {notice && (
          <p className={`notice notice-${notice.kind}`} role="status">
            {notice.text}
            <button
              type="button"
              className="notice-close"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </p>
        )}

        {/* Saved plans */}
        <section className="panel" aria-label="Saved plans">
          <div className="panel-head">
            <h2>Saved plans</h2>
            {loadedPlan && (
              <span className="muted">
                {isDirty ? 'Editing — unsaved changes' : `On “${loadedPlan.name}”`}
              </span>
            )}
          </div>

          <div className="save-row">
            <input
              className="text-input"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveNewPlan()}
              placeholder="Name this arrangement"
              aria-label="Plan name"
            />
            <button type="button" className="btn btn-primary" onClick={saveNewPlan}>
              Save
            </button>
          </div>

          {isDirty && (
            <button type="button" className="btn btn-accent full" onClick={updateLoadedPlan}>
              Update “{loadedPlan!.name}”
            </button>
          )}

          {savedPlans.length === 0 ? (
            <p className="empty-line">
              No saved plans yet. Arrange the table, name it, then save it to reuse later.
            </p>
          ) : (
            <ul className="plan-list">
              {savedPlans.map((plan) => {
                const count = Object.keys(plan.assignments).length
                const active = plan.id === loadedPlanId
                return (
                  <li key={plan.id} className={`plan-item ${active ? 'plan-active' : ''}`}>
                    <button
                      type="button"
                      className="plan-main"
                      onClick={() => loadPlan(plan)}
                      aria-label={`Load ${plan.name}`}
                    >
                      <span className="plan-name">{plan.name}</span>
                      <span className="muted">
                        {plan.shape} · {count} of {plan.seats} seats filled
                      </span>
                    </button>
                    <button
                      type="button"
                      className="plan-delete"
                      onClick={() => deletePlan(plan)}
                      aria-label={`Delete ${plan.name}`}
                    >
                      Delete
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Guest list editing */}
        <section className="panel" aria-label="Edit guest list">
          <div className="panel-head">
            <h2>Guest list</h2>
          </div>
          <div className="save-row">
            <input
              className="text-input"
              value={newGuest}
              onChange={(e) => setNewGuest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGuest()}
              placeholder="Add a guest"
              aria-label="New guest name"
            />
            <button type="button" className="btn btn-primary" onClick={addGuest}>
              Add
            </button>
          </div>
          {guests.length > 0 && (
            <ul className="guest-edit-list">
              {guests.map((name) => (
                <li key={name} className="guest-edit-item">
                  <input
                    className="text-input"
                    defaultValue={name}
                    onBlur={(e) => renameGuest(name, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    aria-label={`Rename ${name}`}
                  />
                  <button
                    type="button"
                    className="guest-remove"
                    onClick={() => removeGuest(name)}
                    aria-label={`Remove ${name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Export / import */}
        <section className="panel" aria-label="Save and share">
          <div className="panel-head">
            <h2>Save &amp; share</h2>
          </div>
          <div className="button-grid">
            <button type="button" className="btn" onClick={downloadImage} disabled={exporting}>
              {exporting ? 'Preparing image…' : 'Download image'}
            </button>
            <button type="button" className="btn" onClick={exportConfig}>
              Export file
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Import file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importConfig(file)
                e.target.value = ''
              }}
            />
          </div>
          <p className="hint">
            The image captures just the table. Export a file to move your guests and plans to
            another device.
          </p>
        </section>

        <footer className="app-foot">
          <a href="/devs.html">Thorley Park Devs</a>
        </footer>
      </main>
    </div>
  )
}
