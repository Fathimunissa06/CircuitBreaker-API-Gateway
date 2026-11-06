import { SERVICES, LATENCY, STATUS_TEXT, TONE, formatItem, ago } from './api'

const ICONS = {
  home: <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  zap: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
}
export const Icon = ({ name }) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
)

const stateName = (s) => (s === 'HALF_OPEN' ? 'Half-open' : s === 'OPEN' ? 'Open' : 'Closed')
const stateTone = (s) => (s === 'OPEN' ? 'bad' : s === 'HALF_OPEN' ? 'warn' : 'ok')

export const PageHead = ({ title, sub, children }) => (
  <div className="head">
    <div><h1>{title}</h1><p>{sub}</p></div>
    {children}
  </div>
)

function Spark({ data }) {
  const max = Math.max(2500, ...data)
  const y = 48 - (2000 / max) * 44
  return (
    <svg className="spark" viewBox="0 0 240 48" preserveAspectRatio="none" role="img" aria-label="Recent response times">
      <line x1="0" x2="240" y1={y} y2={y} className="limit" />
      {data.map((ms, i) => {
        const h = Math.max(2, (ms / max) * 44)
        return <rect key={i} x={i * 10} y={48 - h} width="7" height={h} rx="1.5" className={ms > 2000 ? 'slow' : 'fast'} />
      })}
    </svg>
  )
}

function Switch({ state }) {
  return (
    <div className="switch" data-state={state} aria-hidden="true">
      <div className="slot"><div className="lever" /></div>
      <span className="sw-on">Closed</span><span className="sw-mid">Half-open</span><span className="sw-off">Open</span>
    </div>
  )
}

function Flow({ d }) {
  const gw = Object.keys(d.res).length === 0 ? 'idle' : SERVICES.every((s) => d.res[s.key]?.status === 'DOWN') ? 'bad' : 'ok'
  return (
    <div className="flow">
      <div className="node ok"><b>React app</b><span>port 5173</span></div>
      <div className="link-line" />
      <div className={`node gw ${gw}`}>
        <b>API Gateway</b><span>port 8080</span>
        <ul><li>Rate limiter: 5 per second</li><li>Bulkhead: 3 at once</li><li>Circuit breaker: {stateName(d.state).toLowerCase()}</li></ul>
      </div>
      <div className="link-line" />
      <div className="stack">
        {SERVICES.map((s) => (
          <div key={s.key} className={`node ${d.res[s.key] ? TONE[d.res[s.key].status] : 'idle'}`}>
            <b>{s.name.replace(' Service', '')}</b><span>port {s.port}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const Empty = ({ children }) => <p className="empty">{children}</p>

export function Overview({ d }) {
  const healthy = SERVICES.filter((s) => d.res[s.key]?.status === 'UP').length
  const rec = d.res.recommendation
  const tiles = [
    { label: 'Circuit breaker', value: stateName(d.state), tone: stateTone(d.state) },
    { label: 'Healthy services', value: `${healthy} of ${SERVICES.length}`, tone: healthy === SERVICES.length ? 'ok' : 'warn' },
    { label: 'Recommendation speed', value: rec ? `${rec.ms} ms` : '–', tone: rec && rec.ms > 2000 ? 'bad' : 'ok' },
    { label: 'Registered instances', value: Array.isArray(d.registry) ? d.registry.length : '–', tone: 'ok' },
  ]
  return (
    <>
      <PageHead title="Overview" sub="The health of your e-commerce platform at a glance." />
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`panel tile ${t.tone}`}><p className="small">{t.label}</p><p className="big">{t.value}</p></div>
        ))}
      </div>
      <section className="panel"><h3>Request path</h3><p className="small">How a request travels from the browser to a service.</p><Flow d={d} /></section>
      <section className="panel">
        <h3>Latest activity</h3>
        <ol className="log">
          {d.events.length === 0 && <li className="empty">Nothing yet. Open the Circuit Breaker page and try a latency button.</li>}
          {d.events.slice(0, 4).map((e, i) => <li key={i}><time>{e.time}</time> {e.text}</li>)}
        </ol>
      </section>
    </>
  )
}

const EXPLAIN = [
  { id: 'CLOSED', title: 'Closed', text: 'Everything works. Requests go straight to the service.' },
  { id: 'HALF_OPEN', title: 'Half-open', text: 'The breaker lets a few test requests through to see if the service recovered.' },
  { id: 'OPEN', title: 'Open', text: 'The service keeps failing. Requests are blocked and the fallback answer is returned instantly.' },
]

export function BreakerPage({ d }) {
  const failure = d.breaker.failureRate != null && d.breaker.failureRate >= 0 ? `${Math.round(d.breaker.failureRate)}%` : 'n/a'
  return (
    <>
      <PageHead title="Circuit Breaker" sub="Watch the breaker protect the Recommendation service." />
      <section className={`panel hero s-${d.state}`} aria-live="polite">
        <Switch state={d.state} />
        <div className="verdict">
          <p className="small">Recommendation circuit breaker</p>
          <h2>{stateName(d.state)}</h2>
          <p className="small ctl-label">Slow down the Recommendation service</p>
          <div className="seg" role="group" aria-label="Inject latency">
            {LATENCY.map((o) => <button key={o.ms} className={d.latency === o.ms ? 'on' : ''} onClick={() => d.setDelay(o.ms)}>{o.label}</button>)}
          </div>
        </div>
        <dl className="metrics">
          <div><dt>Failure rate</dt><dd>{failure}</dd></div>
          <div><dt>Failed calls</dt><dd>{d.breaker.failedCalls ?? '–'}</dd></div>
          <div><dt>Successful calls</dt><dd>{d.breaker.successfulCalls ?? '–'}</dd></div>
          <div><dt>Blocked while open</dt><dd>{d.breaker.notPermittedCalls ?? '–'}</dd></div>
        </dl>
      </section>
      <div className="three">
        {EXPLAIN.map((e) => (
          <div key={e.id} className={`panel explain ${d.state === e.id ? `now ${stateTone(e.id)}` : ''}`}>
            <h3>{e.title}</h3><p>{e.text}</p>{d.state === e.id && <span className={`chip ${stateTone(e.id)}`}>Current state</span>}
          </div>
        ))}
      </div>
    </>
  )
}

export function ServicesPage({ d }) {
  return (
    <>
      <PageHead title="Services" sub="Live health, speed and data for each microservice." />
      <div className="three">
        {SERVICES.map((s) => {
          const r = d.res[s.key]
          return (
            <article key={s.key} className={`panel card ${r ? TONE[r.status] : 'idle'}`}>
              <header><span className="dot" /><div><h3>{s.name}</h3><p className="small">{s.note} · port {s.port}</p></div></header>
              <p className="state">{r ? STATUS_TEXT[r.status] : 'Checking…'}<span className="ms">{r ? `${r.ms} ms` : ''}</span></p>
              <Spark data={d.hist[s.key]} />
              <ul className="items">
                {r?.items ? r.items.map((it, i) => <li key={i}>{formatItem(it)}</li>) : <li className="empty">No data to show right now.</li>}
              </ul>
            </article>
          )
        })}
      </div>
    </>
  )
}

export function ProtectionPage({ d }) {
  return (
    <>
      <PageHead title="Protection" sub="Rate limiting and bulkhead keep the gateway safe under heavy traffic.">
        <button className="btn-main" onClick={d.runFlood} disabled={d.flooding}>{d.flooding ? 'Sending…' : 'Send 20 quick requests'}</button>
      </PageHead>
      <div className="two">
        <div className="panel"><h3>Rate limiter</h3><p>Lets each visitor make 5 requests per second, with bursts up to 10. Extra requests get <b>429 Too Many Requests</b>. It stops bots and floods.</p></div>
        <div className="panel"><h3>Bulkhead</h3><p>Allows only 3 Recommendation calls at the same time. More are refused with <b>503</b> straight away, so a slow service cannot use up every thread.</p></div>
      </div>
      <section className="panel">
        <h3>Last test result</h3>
        {d.flood ? (
          <>
            <div className="stackbar" role="img" aria-label="Flood test result">
              {Object.entries(d.flood).filter(([, v]) => v > 0).map(([k, v]) => <span key={k} className={TONE[k]} style={{ flex: v }}>{v}</span>)}
            </div>
            <ul className="legend">{Object.entries(d.flood).map(([k, v]) => <li key={k} className={`chip ${TONE[k]}`}>{STATUS_TEXT[k]}: <b>{v}</b></li>)}</ul>
          </>
        ) : <Empty>No test yet. Press “Send 20 quick requests”. If “Rate limited” stays 0, check that Redis is running.</Empty>}
      </section>
    </>
  )
}

export function RegistryPage({ d }) {
  return (
    <>
      <PageHead title="Service registry" sub="Every service that has registered itself with Eureka." />
      <section className="panel">
        {d.registry === undefined ? <Empty>Loading…</Empty>
          : d.registry === null ? <Empty>Could not read Eureka. Check it runs on port 8761 and restart <code>npm run dev</code> after replacing vite.config.js.</Empty>
          : (
            <table>
              <thead><tr><th>Service</th><th>Status</th><th>Address</th></tr></thead>
              <tbody>{d.registry.map((r, i) => (
                <tr key={i}><td>{r.app.toLowerCase()}</td><td><span className={`chip ${r.status === 'UP' ? 'ok' : 'bad'}`}>{r.status}</span></td><td>{r.ip}:{r.port}</td></tr>
              ))}</tbody>
            </table>
          )}
      </section>
    </>
  )
}

export function TracesPage({ d }) {
  return (
    <>
      <PageHead title="Traces" sub="Recent requests through the gateway, collected by Zipkin.">
        <a className="btn-main" href="http://localhost:9411" target="_blank" rel="noreferrer">Open Zipkin</a>
      </PageHead>
      <section className="panel">
        {d.traces === undefined ? <Empty>Loading…</Empty>
          : d.traces === null ? <Empty>Could not read Zipkin. Check it runs on port 9411.</Empty>
          : d.traces.length === 0 ? <Empty>No traces yet. Make a few requests first.</Empty>
          : (
            <ul className="traces">
              {d.traces.map((t) => (
                <li key={t.id}>
                  <a href={`http://localhost:9411/zipkin/traces/${t.id}`} target="_blank" rel="noreferrer">
                    <span className="t-name">{t.name}</span>
                    <span className="t-svc">{t.services.join(', ')}</span>
                    <span className={`t-ms ${t.ms > 2000 ? 'bad-text' : ''}`}>{t.ms} ms</span>
                    <span className="small">{ago(t.ts)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
      </section>
    </>
  )
}

export function ActivityPage({ d }) {
  return (
    <>
      <PageHead title="Activity" sub="Everything that changed while this page was open." />
      <section className="panel">
        <ol className="log">
          {d.events.length === 0 && <li className="empty">Nothing yet. Open the Circuit Breaker page and press a latency button.</li>}
          {d.events.map((e, i) => <li key={i}><time>{e.time}</time> {e.text}</li>)}
        </ol>
      </section>
    </>
  )
}
