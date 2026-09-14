import { useEffect, useState } from 'react'

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const AVATAR_MAP = {
  bank: '🏛️',
  executive: '👔',
  emergency: '🚨',
  family: '👵',
  doctor: '🩺',
  work: '💻',
  tax: '⚖️',
  shopping: '📦',
  pharmacy: '💊',
  friend: '☕',
  airline: '✈️',
  crypto: '🪙',
  home: '🏢',
  medical: '🏥',
  tech: '🖥️',
  test: '🔬',
}

export function CallScreen({ session }) {
  const { status, clip, elapsedS, rollingHumanConfidence, chunks, error, chunkSeconds } = session
  const [ringingDots, setRingingDots] = useState('')

  useEffect(() => {
    if (status !== 'ringing') return
    const t = setInterval(() => setRingingDots((d) => (d.length >= 3 ? '' : d + '.')), 400)
    return () => clearInterval(t)
  }, [status])

  const avatar = AVATAR_MAP[clip?.avatar] || (clip?.label === 'synthetic' ? '🤖' : '👤')
  const callerName = clip?.caller_name || clip?.id || 'Unknown Caller'
  const phoneNumber = clip?.phone_number || '+1 (800) 555-VOXG'
  const scenario = clip?.scenario || clip?.generator_type

  if (status === 'ringing') {
    return (
      <div className="phone-container">
        <div className="phone-notch">
          <div className="phone-speaker" />
          <div className="phone-camera" />
        </div>

        <div className="call-header">
          <div className="caller-avatar-circle pulse">{avatar}</div>
          <h2 className="call-title">{callerName}</h2>
          <p className="call-number">{phoneNumber}</p>
          {scenario && <span className="call-scenario-tag">{scenario}</span>}
        </div>

        <p className="sub" style={{ marginTop: '20px' }}>
          Incoming call{ringingDots}
        </p>

        <div className="call-actions">
          <button className="btn decline" onClick={session.decline}>
            Decline
          </button>
          <button className="btn accept big" onClick={session.accept}>
            📲 Answer Call
          </button>
        </div>
      </div>
    )
  }

  const humanPct = rollingHumanConfidence == null ? null : Math.round(rollingHumanConfidence * 100)
  const isSynthetic = humanPct != null && humanPct < 50
  const aiPct = humanPct == null ? null : 100 - humanPct

  return (
    <div className="phone-container">
      <div className="phone-notch">
        <div className="phone-speaker" />
        <div className="phone-camera" />
      </div>

      <div className="call-header">
        <div className="caller-avatar-circle">{avatar}</div>
        <h2 className="call-title">{callerName}</h2>
        <p className="call-number">{phoneNumber}</p>
        <p className="timer" style={{ marginTop: '6px' }}>{fmtTime(elapsedS)}</p>
      </div>

      {/* Animated Soundwave Visualizer */}
      <div className="waveform-container">
        <div className="wave-bar" />
        <div className="wave-bar" />
        <div className="wave-bar" />
        <div className="wave-bar" />
        <div className="wave-bar" />
      </div>

      {/* Live Authenticity / Threat Meter */}
      <div className="live-meter-card">
        <div className="meter-header">
          <span className="meter-title">Real-Time Voice Screener</span>
          <span
            className={`meter-score ${
              humanPct == null ? 'analyzing' : isSynthetic ? 'danger' : 'safe'
            }`}
          >
            {humanPct == null
              ? 'Analyzing...'
              : isSynthetic
              ? `${aiPct}% AI Clone`
              : `${humanPct}% Human`}
          </span>
        </div>

        <div className="meter-track">
          <div
            className="meter-bar"
            style={{
              width: `${humanPct == null ? 40 : isSynthetic ? aiPct : humanPct}%`,
              background:
                humanPct == null
                  ? '#38bdf8'
                  : isSynthetic
                  ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                  : 'linear-gradient(90deg, #10b981, #059669)',
            }}
          />
        </div>

        {isSynthetic && (
          <div className="call-alert-banner danger">
            <span>🚨</span>
            <span>WARNING: Voice clone patterns detected. Terminate call!</span>
          </div>
        )}

        {humanPct != null && !isSynthetic && (
          <div className="call-alert-banner safe">
            <span>🛡️</span>
            <span>Natural vocal cadence verified. No clone signature.</span>
          </div>
        )}
      </div>

      {error && <p className="error banner">{error}</p>}

      <p className="chunk-note" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
        Processed {chunks.length} window{chunks.length === 1 ? '' : 's'} ({chunkSeconds}s slices) · 290ms avg CPU latency
      </p>

      <div style={{ marginTop: '20px' }}>
        <button className="btn decline big" onClick={session.endCall} style={{ width: '100%' }}>
          🔴 Hang Up Call
        </button>
      </div>
    </div>
  )
}
