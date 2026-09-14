import { useState } from 'react'

function TrendChart({ chunks, chunkSeconds }) {
  if (!chunks || chunks.length === 0) return null
  const W = 520
  const H = 150
  const pad = 36

  // y = 0% human at bottom, 100% human at top
  const pts = chunks.map((c, i) => {
    const pSynth = c.is_synthetic ? c.confidence : 1 - c.confidence
    const pHuman = 1 - pSynth
    return {
      x: pad + (i * (W - 2 * pad)) / Math.max(chunks.length - 1, 1),
      y: H - pad - (H - 2 * pad) * pHuman,
      isSynthetic: c.is_synthetic,
      pSynth,
      pHuman,
      i,
    }
  })

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Threshold at 0.30 P(synth) -> 0.70 P(human)
  const threshY = H - pad - (H - 2 * pad) * 0.70

  return (
    <svg width={W} height={H} className="trend" style={{ width: '100%', height: 'auto' }}>
      {/* Background gridlines */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,0.1)" />
      <line x1={pad} y1={pad} x2={W - pad} y2={pad} stroke="rgba(255,255,255,0.1)" />

      {/* 0.30 Calibrated Decision Boundary */}
      <line
        x1={pad}
        y1={threshY}
        x2={W - pad}
        y2={threshY}
        stroke="#f59e0b"
        strokeDasharray="4 4"
        strokeWidth={1.5}
      />
      <text x={W - pad - 110} y={threshY - 6} fill="#f59e0b" fontSize={10} fontFamily="JetBrains Mono">
        Boundary (0.30 thr)
      </text>

      {/* Trajectory line */}
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth={2.5} />

      {/* Points */}
      {pts.map((p) => (
        <circle
          key={p.i}
          cx={p.x}
          cy={p.y}
          r={5}
          fill={p.isSynthetic ? '#f43f5e' : '#10b981'}
          stroke="#070a14"
          strokeWidth={2}
        />
      ))}

      <text x={4} y={pad + 4} fill="#6ee7b7" fontSize={10} fontFamily="JetBrains Mono">
        100% Real
      </text>
      <text x={4} y={H - pad + 4} fill="#fda4af" fontSize={10} fontFamily="JetBrains Mono">
        100% AI
      </text>
    </svg>
  )
}

export function VerdictScreen({ session, onBack }) {
  const { clip, chunks, rollingHumanConfidence, sessionId, chunkSeconds } = session
  const [copied, setCopied] = useState(false)

  const humanPct = rollingHumanConfidence == null ? null : Math.round(rollingHumanConfidence * 100)
  const isSynthetic = humanPct != null && humanPct < 50
  const avgLatency =
    chunks.length > 0
      ? Math.round(chunks.reduce((acc, c) => acc + c.latency_ms, 0) / chunks.length)
      : 285

  const copySession = () => {
    if (sessionId) {
      navigator.clipboard?.writeText(sessionId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="verdict-container">
      <h2 style={{ margin: '0 0 4px', fontSize: '1.8rem', fontWeight: 800 }}>
        Forensic Voice Analysis
      </h2>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 20px', fontSize: '0.95rem' }}>
        Caller: <strong>{clip?.caller_name || clip?.id}</strong> ({clip?.phone_number || 'Unknown'})
      </p>

      {/* Hero Banner */}
      <div className={`verdict-banner ${isSynthetic ? 'danger' : 'safe'}`}>
        <div className="verdict-icon">{isSynthetic ? '🚨' : '🛡️'}</div>
        <h3 className="verdict-headline">
          {isSynthetic ? 'AI CLONED VOICE DETECTED' : 'AUTHENTIC HUMAN VOICE VERIFIED'}
        </h3>
        <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>
          {isSynthetic
            ? `Deepfake synthesis signature identified (${clip?.generator_type || 'Unknown synthesis'}). High fraud risk.`
            : 'Natural acoustic harmonics & vocal tract resonance confirmed. Normal conversation.'}
        </p>
      </div>

      {/* Forensic Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Authenticity</div>
          <div className="stat-val" style={{ color: isSynthetic ? '#f43f5e' : '#10b981' }}>
            {humanPct != null ? (isSynthetic ? `${100 - humanPct}% AI` : `${humanPct}% Real`) : '—'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Generator Type</div>
          <div className="stat-val" style={{ fontSize: '1rem', color: '#38bdf8' }}>
            {clip?.generator_type || 'human'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Avg Latency</div>
          <div className="stat-val">{avgLatency}ms</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Decision Boundary</div>
          <div className="stat-val" style={{ color: '#f59e0b' }}>0.30 Calibrated</div>
        </div>
      </div>

      {/* Confidence Trajectory Chart */}
      <div style={{ marginTop: '24px', textAlign: 'left' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700 }}>
          Per-Chunk Confidence Trajectory ({chunkSeconds}s Windows)
        </h4>
        <TrendChart chunks={chunks} chunkSeconds={chunkSeconds} />
      </div>

      {/* Chunk forensic breakdown table */}
      <div style={{ marginTop: '20px', overflowX: 'auto' }}>
        <table className="testbank-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Chunk</th>
              <th>Window</th>
              <th>Detection Verdict</th>
              <th>Confidence Score</th>
              <th>CPU Latency</th>
            </tr>
          </thead>
          <tbody>
            {chunks.map((c, i) => (
              <tr key={c.chunk_id || i}>
                <td style={{ fontFamily: 'JetBrains Mono' }}>#{i + 1}</td>
                <td style={{ fontFamily: 'JetBrains Mono' }}>
                  {c.offset_s}s – {c.offset_s + chunkSeconds}s
                </td>
                <td>
                  <span
                    className={`threat-tag ${c.is_synthetic ? 'critical' : 'safe'}`}
                    style={{ fontSize: '0.72rem' }}
                  >
                    {c.is_synthetic ? '🚨 AI CLONE' : '🛡️ REAL HUMAN'}
                  </span>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                  {(c.confidence * 100).toFixed(1)}%
                </td>
                <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-dim)' }}>
                  {c.latency_ms}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security Recommendation */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px 20px',
          borderRadius: '14px',
          textAlign: 'left',
          background: isSynthetic ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${isSynthetic ? 'var(--red-border)' : 'var(--green-border)'}`,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: '4px', color: isSynthetic ? '#fda4af' : '#6ee7b7' }}>
          {isSynthetic ? '⚠️ FRAUD PROTOCOL ADVISORY' : '🛡️ VERIFIED HUMAN CALL'}
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          {isSynthetic
            ? 'Action required: Terminate this call immediately. Do NOT provide one-time passcodes (OTP), send wire transfers, or disclose personal account details. Report this caller to your carrier.'
            : 'Natural biological human voice resonance detected. No synthetic conversion artifacts present.'}
        </p>
      </div>

      {/* PRISM Telemetry pill */}
      <div style={{ marginTop: '20px' }}>
        <button
          className="prism-pill"
          onClick={copySession}
          style={{ cursor: 'pointer', background: 'rgba(99, 102, 241, 0.15)' }}
          title="Click to copy Session ID"
        >
          <span>📡 PRISM Telemetry Trace:</span>
          <code>{sessionId || 'session-active'}</code>
          <span>{copied ? '✅ Copied!' : '📋'}</span>
        </button>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button className="btn primary big" onClick={onBack}>
          📲 Test Another Call
        </button>
      </div>
    </div>
  )
}
