import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
  if (!raw) return '/api'
  // If env points to server origin (e.g. http://localhost:3001), append /api.
  if (/^https?:\/\//.test(raw) && !raw.endsWith('/api')) return `${raw}/api`
  return raw
}
const API = resolveApiBase()
const MONTH_START = '2026-04-01'
const MONTH_END = '2026-04-30'

function localDateISO(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function clampDateToApril(iso) {
  if (iso < MONTH_START) return MONTH_START
  if (iso > MONTH_END) return MONTH_END
  return iso
}

function initialDate() {
  return clampDateToApril(localDateISO())
}

function formatHourLabel(h) {
  if (h === 0) return '12:00 AM'
  if (h < 12) return `${h}:00 AM`
  if (h === 12) return '12:00 PM'
  return `${h - 12}:00 PM`
}

function isSameLocalDay(iso, ref = new Date()) {
  return iso === localDateISO(ref)
}

export default function App() {
  const dateInputRef = useRef(null)
  const [role, setRole] = useState('user')
  const [date, setDate] = useState(initialDate)
  const [slots, setSlots] = useState([])
  const [selectedHour, setSelectedHour] = useState(9)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const path =
        role === 'admin' ? `${API}/admin/slots/${date}` : `${API}/slots/${date}`
      const r = await fetch(path)
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json()
      setSlots(data)
    } catch (e) {
      setMessage('Could not load slots.')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [date, role])

  useEffect(() => {
    load()
  }, [load])

  const byHour = useMemo(() => {
    const m = new Map()
    for (const row of slots) m.set(row.hour, row)
    return m
  }, [slots])

  const userAvailable = (h) => {
    const row = byHour.get(h)
    return row ? !!row.available : false
  }

  const adminRow = (h) => byHour.get(h)

  const book = async () => {
    setMessage('')
    if (!userAvailable(selectedHour)) {
      setMessage('Pick a green hour to book.')
      return
    }
    try {
      const r = await fetch(`${API}/slots/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, hour: selectedHour }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setMessage(body.error || 'Booking failed.')
        return
      }
      setMessage('Booked.')
      load()
    } catch {
      setMessage('Booking failed.')
    }
  }

  const setBlocked = async (hour, blocked, left) => {
    setMessage('')
    if (left == 0) return;
    try {
      const r = await fetch(`${API}/admin/slots/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, hour, blocked: blocked ? 1 : 0 }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setMessage(body.error || 'Update failed.')
        return
      }
      load()
    } catch {
      setMessage('Update failed.')
    }
  }

  const dateButtonLabel = isSameLocalDay(date) ? 'Today' : date

  return (
    <div className="app">
      <header className="brand">
        <div className="brand-lines">
          <span>KYBANS INDIA PVT LTD</span>
          <span className="brand-sub">KYBANS INDIA PVT LT</span>
        </div>
        <div className="role-toggle">
          <button
            type="button"
            className={role === 'user' ? 'active' : ''}
            onClick={() => setRole('user')}
          >
            User
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'active' : ''}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h1>Select Slot</h1>
          <label
            className="date-btn"
            onClick={() => {
              const el = dateInputRef.current
              if (!el) return
              if (typeof el.showPicker === 'function') {
                try {
                  el.showPicker()
                } catch {
                  el.focus()
                  el.click()
                }
              } else {
                el.focus()
                el.click()
              }
            }}
          >
            <svg className="cal" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
              <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{dateButtonLabel}</span>
            <input
              ref={dateInputRef}
              type="date"
              min={MONTH_START}
              max={MONTH_END}
              value={date}
              onChange={(e) => setDate(clampDateToApril(e.target.value))}
            />
          </label>
        </div>

        <div className="timeline-wrap">
          <div
            className="caret"
            style={{ left: `calc(${(selectedHour + 0.5) / 24} * 100%)` }}
            aria-hidden
          />
          <div className="timeline" role="list">
            {Array.from({ length: 24 }, (_, h) => {
              const avail = role === 'user' ? userAvailable(h) : adminAvailable(adminRow(h))
              return (
                <button
                  key={h}
                  type="button"
                  role="listitem"
                  className={`seg ${avail ? 'avail' : 'busy'}`}
                  title={formatHourLabel(h)}
                  aria-label={`${formatHourLabel(h)} ${avail ? 'available' : 'unavailable'}`}
                  aria-pressed={selectedHour === h}
                  onClick={() => setSelectedHour(h)}
                />
              )
            })}
          </div>
          <div className="ticks-row" aria-hidden>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="tick-label">
                {formatHourLabel(h)}
              </span>
            ))}
          </div>
        </div>

        {role === 'user' && (
          <div className="actions">
            <p className="hint">
              Selected: <strong>{formatHourLabel(selectedHour)}</strong>
            </p>
            <button type="button" className="primary" onClick={book} disabled={loading}>
              Book this hour
            </button>
          </div>
        )}

        {role === 'admin' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hour</th>
                  <th>Sub-slots left</th>
                  <th>Blocked</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }, (_, h) => {
                  const row = adminRow(h)
                  const left = row?.sub_slots ?? '—'
                  const blocked = !!row?.blocked
                  return (
                    <tr key={h} className={h === selectedHour ? 'row-active' : ''}>
                      <td>{formatHourLabel(h)}</td>
                      <td>{left}</td>
                      <td>{blocked ? 'Yes' : 'No'}</td>
                      <td>
                        {blocked ? (
                          <button type="button" onClick={() => setBlocked(h, false, left)}>
                            Unblock
                          </button>
                        ) : (
                          <button type="button" disabled={left === 0} onClick={() => setBlocked(h, true, left)}>
                            {(left === 0) ? 'Slots booked' : 'Block'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {message && <p className="msg">{message}</p>}
        {loading && <p className="muted">Loading…</p>}
      </section>
    </div>
  )
}

function adminAvailable(row) {
  if (!row) return false
  return row.sub_slots > 0 && row.blocked === 0
}
