import { useEffect, useRef, useState } from 'react'
import { sendDrop, markOpened, destroyDrop, subscribeToThread } from './firebase.js'

function JoinScreen({ onJoin }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>DEAD <span>DROP</span></h1>
          <div className="case-no">FILE NO. 15-SEC PROTOCOL</div>
        </div>
        <div className="stamp">CONFIDENTIAL</div>
      </header>

      <div className="panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h2>Join a Thread</h2>
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div>
            <label>Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jin"
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>
          <div>
            <label>Thread code (share this with the other person)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="e.g. black-org-07"
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>
          <button
            disabled={!name.trim() || !code.trim()}
            onClick={() => onJoin(name.trim(), code.trim())}
          >
            Enter Thread →
          </button>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'rgba(237,230,214,0.45)', lineHeight: 1.6 }}>
            Anyone who types the same thread code lands in the same conversation.
            Treat the code like a shared password — pick something the other person
            already knows, not something guessable.
          </div>
        </div>
      </div>
    </div>
  )
}

function DropCard({ drop, now, self, onOpen }) {
  const total = drop.windowSeconds * 1000
  const elapsed = now - drop.createdAtMillis
  const remaining = Math.max(0, total - elapsed)
  const pct = drop.opened ? 100 : Math.max(0, Math.round((remaining / total) * 100))
  const secsLeft = Math.ceil(remaining / 1000)
  const mine = drop.sender === self

  return (
    <div className="msg">
      {!drop.opened && (
        <div className="ring" data-t={secsLeft} style={{ '--pct': pct }} onClick={() => onOpen(drop.id)} />
      )}
      <div className="msg-body">
        <div className="msg-title">
          {mine ? 'You sent' : `From ${drop.sender}`} · {drop.opened ? 'opened' : 'sealed'}
        </div>
        <div className={drop.opened ? 'msg-text' : 'msg-text sealed'}>
          {drop.opened ? drop.text : 'Tap the ring to open before it burns out.'}
        </div>
      </div>
      {!drop.opened && (
        <div className="msg-actions">
          <button className="ghost" onClick={() => onOpen(drop.id)}>Open</button>
        </div>
      )}
    </div>
  )
}

function ThreadScreen({ name, code }) {
  const [drops, setDrops] = useState({})
  const [destroyedFlashes, setDestroyedFlashes] = useState([])
  const [text, setText] = useState('')
  const [windowSeconds, setWindowSeconds] = useState(15)
  const [now, setNow] = useState(Date.now())
  const triedDestroy = useRef(new Set())

  useEffect(() => {
    const unsubscribe = subscribeToThread(code, (type, id, data) => {
      if (type === 'removed') {
        setDrops((prev) => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
        setDestroyedFlashes((prev) => [...prev, { id, label: data.opened ? 'DELETED' : 'DESTROYED — NEVER OPENED' }])
        setTimeout(() => {
          setDestroyedFlashes((prev) => prev.filter((f) => f.id !== id))
        }, 1500)
        return
      }
      setDrops((prev) => ({
        ...prev,
        [id]: {
          id,
          ...data,
          createdAtMillis: data.createdAt ? data.createdAt.toMillis() : Date.now()
        }
      }))
    })
    return () => unsubscribe()
  }, [code])

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now()
      setNow(t)
      Object.values(drops).forEach((drop) => {
        if (drop.opened) return
        const expiresAt = drop.createdAtMillis + drop.windowSeconds * 1000
        if (t >= expiresAt && !triedDestroy.current.has(drop.id)) {
          triedDestroy.current.add(drop.id)
          destroyDrop(code, drop.id).catch(() => {})
        }
      })
    }, 200)
    return () => clearInterval(interval)
  }, [drops, code])

  function handleSend() {
    const t = text.trim()
    if (!t) return
    const secs = Math.max(3, Math.min(120, Number(windowSeconds) || 15))
    sendDrop(code, { text: t, sender: name, windowSeconds: secs })
    setText('')
  }

  function handleOpen(id) {
    markOpened(code, id).catch(() => {})
  }

  const sorted = Object.values(drops).sort((a, b) => b.createdAtMillis - a.createdAtMillis)

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>DEAD <span>DROP</span></h1>
          <div className="case-no">THREAD: {code} · YOU: {name}</div>
        </div>
        <div className="stamp">CONFIDENTIAL</div>
      </header>

      <div className="grid">
        <div className="panel">
          <h2>Compose</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write the message the ally must not miss..."
          />
          <div className="row">
            <label>Self-destruct if unopened after (sec)</label>
            <input
              type="number"
              value={windowSeconds}
              min={3}
              max={120}
              onChange={(e) => setWindowSeconds(e.target.value)}
              style={{ width: 70 }}
            />
          </div>
          <div className="row">
            <button onClick={handleSend}>Send Drop →</button>
          </div>
        </div>

        <div className="panel">
          <h2>Thread</h2>
          {sorted.length === 0 && destroyedFlashes.length === 0 && (
            <div className="inbox-empty">No drops yet in this thread.</div>
          )}
          {destroyedFlashes.map((f) => (
            <div className="destroyed" key={f.id}>
              <span className="stampmark">{f.label}</span>
            </div>
          ))}
          {sorted.map((drop) => (
            <DropCard key={drop.id} drop={drop} now={now} self={name} onOpen={handleOpen} />
          ))}
        </div>
      </div>

      <footer>
        Destruction is enforced by whichever phone has this page open when the timer hits zero —
        for guaranteed server-side deletion even while both phones are closed, add a scheduled
        Cloud Function later (see README).
      </footer>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)

  if (!session) {
    return <JoinScreen onJoin={(name, code) => setSession({ name, code })} />
  }
  return <ThreadScreen name={session.name} code={session.code} />
}
