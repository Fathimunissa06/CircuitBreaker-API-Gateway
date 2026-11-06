import { useEffect, useRef, useState } from 'react'
import { SERVICES, probe, loadRegistry, loadTraces } from './api'

// One hook holds all live data, so every page can read it
export function useDashboard() {
  const [res, setRes] = useState({})
  const [hist, setHist] = useState({ product: [], inventory: [], recommendation: [] })
  const [breaker, setBreaker] = useState({ state: 'CLOSED' })
  const [events, setEvents] = useState([])
  const [latency, setLatency] = useState(0)
  const [flood, setFlood] = useState(null)
  const [flooding, setFlooding] = useState(false)
  const [registry, setRegistry] = useState(undefined)
  const [traces, setTraces] = useState(undefined)
  const [updated, setUpdated] = useState(null)
  const last = useRef('CLOSED')

  const log = (text) => setEvents((o) => [{ time: new Date().toLocaleTimeString(), text }, ...o].slice(0, 30))

  useEffect(() => {
    let alive = true
    const poll = async () => {
      const entries = await Promise.all(SERVICES.map(async (s) => [s.key, await probe(s.url)]))
      if (!alive) return
      const map = Object.fromEntries(entries)
      setRes(map)
      setHist((h) => Object.fromEntries(SERVICES.map((s) => [s.key, [...h[s.key], map[s.key].ms].slice(-24)])))
      setUpdated(new Date())
      let info = { state: map.recommendation.status === 'FALLBACK' ? 'OPEN' : 'CLOSED' }
      try {
        const d = await (await fetch('/gateway/breaker')).json()
        if (d.state && d.state !== 'UNKNOWN') info = d
      } catch { /* keep the guess */ }
      setBreaker(info)
      if (info.state !== last.current) {
        log(`Breaker changed: ${last.current} to ${info.state}`)
        last.current = info.state
      }
    }
    poll()
    const t = setInterval(poll, 2000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  useEffect(() => {
    let alive = true
    const slow = async () => {
      const [r, t] = await Promise.all([loadRegistry().catch(() => null), loadTraces().catch(() => null)])
      if (alive) { setRegistry(r); setTraces(t) }
    }
    slow()
    const t = setInterval(slow, 6000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const setDelay = async (ms) => {
    try {
      await fetch(`/chaos/delay?ms=${ms}`, { method: 'POST' })
      setLatency(ms)
      log(ms ? `Latency injected: Recommendation now takes ${ms / 1000} s` : 'Latency removed: Recommendation is fast again')
    } catch {
      log('Could not reach the gateway. Is it running on port 8080?')
    }
  }

  const runFlood = async () => {
    setFlooding(true)
    const runs = await Promise.all(Array.from({ length: 20 }, () => probe('/api/recommendations')))
    const tally = { UP: 0, FALLBACK: 0, LIMITED: 0, BUSY: 0, DOWN: 0 }
    runs.forEach((r) => { tally[r.status] += 1 })
    setFlood(tally)
    log(`Flood test: ${tally.LIMITED} rate limited, ${tally.BUSY} bulkhead-rejected, ${tally.FALLBACK} fallback`)
    setFlooding(false)
  }

  const state = breaker.state
  const anyDown = SERVICES.some((s) => res[s.key]?.status === 'DOWN')
  const overall = anyDown ? ['bad', 'Incident: a service is unreachable']
    : state !== 'CLOSED' ? ['warn', 'Degraded: protection is active']
    : ['ok', 'All systems healthy']

  return { res, hist, breaker, state, events, latency, flood, flooding, registry, traces, updated, overall, setDelay, runFlood }
}