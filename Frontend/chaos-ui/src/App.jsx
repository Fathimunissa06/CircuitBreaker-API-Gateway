import { useEffect, useState } from 'react'
import './App.css'
import { useDashboard } from './useDashboard'
import { Icon, Overview, BreakerPage, ServicesPage, ProtectionPage, RegistryPage, TracesPage, ActivityPage } from './pages'

const ROUTES = [
  { id: 'overview', label: 'Overview', icon: 'home', Page: Overview },
  { id: 'breaker', label: 'Circuit Breaker', icon: 'zap', Page: BreakerPage },
  { id: 'services', label: 'Services', icon: 'server', Page: ServicesPage },
  { id: 'protection', label: 'Protection', icon: 'shield', Page: ProtectionPage },
  { id: 'registry', label: 'Registry', icon: 'list', Page: RegistryPage },
  { id: 'traces', label: 'Traces', icon: 'pulse', Page: TracesPage },
  { id: 'activity', label: 'Activity', icon: 'clock', Page: ActivityPage },
]

const readHash = () => (window.location.hash.slice(1) || 'overview')

export default function App() {
  const d = useDashboard()
  const [route, setRoute] = useState(readHash())

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const current = ROUTES.find((r) => r.id === route) || ROUTES[0]
  const Page = current.Page
  const breakerTone = d.state === 'OPEN' ? 'bad' : d.state === 'HALF_OPEN' ? 'warn' : 'ok'

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><span className="logo-mark" />Breaker Room</div>
        <nav>
          {ROUTES.map((r) => (
            <a key={r.id} href={`#${r.id}`} className={r.id === current.id ? 'active' : ''}>
              <Icon name={r.icon} />
              <span>{r.label}</span>
              {r.id === 'breaker' && <i className={`badge ${breakerTone}`} title={`Breaker ${d.state}`} />}
            </a>
          ))}
        </nav>
        <p className="side-note">Cloud-native e-commerce gateway</p>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className={`pill ${d.overall[0]}`}><span className="dot" />{d.overall[1]}</div>
          <span className="small">{d.updated ? `Updated ${d.updated.toLocaleTimeString()}` : 'Connecting…'}</span>
        </header>
        <main className="content"><Page d={d} /></main>
      </div>
    </div>
  )
}
