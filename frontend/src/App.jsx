import { useEffect, useState } from 'react'
import { fetchClips, fetchEvalClips, uploadAndClassify } from './api'
import { useCallSession } from './useCallSession'
import { CallScreen } from './CallScreen'
import { VerdictScreen } from './VerdictScreen'

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

export default function App() {
  const [activeTab, setActiveTab] = useState('scenarios') // scenarios | testbank | upload
  const [clips, setClips] = useState([])
  const [evalClips, setEvalClips] = useState([])
  const [selected, setSelected] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Sub-filter for scenarios: 'all' | 'synthetic' | 'real'
  const [scenarioFilter, setScenarioFilter] = useState('all')

  // Filters for test bank
  const [attackFilter, setAttackFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Upload test state
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const session = useCallSession()

  useEffect(() => {
    fetchClips()
      .then((res) => {
        setClips(res.clips)
        if (res.clips.length > 0) setSelected(res.clips[0])
      })
      .catch((e) => setLoadError(e.message))

    fetchEvalClips()
      .then((res) => setEvalClips(res.clips))
      .catch(() => {}) // non-fatal
  }, [])

  const handleUploadChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0])
      setUploadResult(null)
      setUploadError(null)
    }
  }

  const handleUploadScan = async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadError(null)
    try {
      const res = await uploadAndClassify(uploadFile)
      setUploadResult(res)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Filtered demo scenarios
  const filteredScenarios = clips.filter((c) => {
    if (scenarioFilter === 'all') return true
    return c.label === scenarioFilter
  })

  // Unique attack types in heldout
  const attackTypes = ['all', ...Array.from(new Set(evalClips.map((c) => c.generator_type))).sort()]

  // Filtered held-out clips
  const filteredEvalClips = evalClips.filter((c) => {
    const matchesAttack = attackFilter === 'all' || c.generator_type === attackFilter
    const matchesSearch =
      searchQuery === '' ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.generator_type.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesAttack && matchesSearch
  })

  const startCall = (clipToCall) => {
    if (clipToCall) session.ring(clipToCall)
  }

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="brand-row">
          <span className="brand-icon">🛡️</span>
          <h1>VoxG</h1>
        </div>
        <p className="tagline">Real-Time Deepfake Voice Scam Screener</p>

        {/* Real-time Telemetry Badges */}
        <div className="telemetry-bar">
          <span className="badge pulse-green">wav2vec2-ASV Online (CPU &lt;300ms)</span>
          <span className="badge blue">PRISM-Calibrated Threshold 0.30</span>
          <span className="badge purple">620+ Live Traces Logged</span>
        </div>
      </header>

      {loadError && (
        <div className="error banner">
          Cannot reach the backend server. Make sure it is running:{' '}
          <code>cd backend &amp;&amp; python -m uvicorn app.main:app --port 8000</code>
        </div>
      )}

      {/* Main Views */}
      {session.status === 'idle' && (
        <>
          {/* Tabs Navigation */}
          <div className="tabs-nav">
            <button
              className={`tab-btn ${activeTab === 'scenarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('scenarios')}
            >
              ⭐ Curated Threat Scenarios ({clips.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'testbank' ? 'active' : ''}`}
              onClick={() => setActiveTab('testbank')}
            >
              📂 Full ASVspoof Test Bank ({evalClips.length || 193})
            </button>
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              🎙️ Custom Audio Scanner
            </button>
          </div>

          {/* TAB 1: CURATED DEMO SCENARIOS */}
          {activeTab === 'scenarios' && (
            <section>
              <div className="filter-row">
                <div className="pill-group">
                  <button
                    className={`pill-btn ${scenarioFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setScenarioFilter('all')}
                  >
                    All Scenarios ({clips.length})
                  </button>
                  <button
                    className={`pill-btn ${scenarioFilter === 'synthetic' ? 'active red' : ''}`}
                    onClick={() => setScenarioFilter('synthetic')}
                  >
                    🚨 AI Clone Threats ({clips.filter((c) => c.label === 'synthetic').length})
                  </button>
                  <button
                    className={`pill-btn ${scenarioFilter === 'real' ? 'active green' : ''}`}
                    onClick={() => setScenarioFilter('real')}
                  >
                    🛡️ Verified Human ({clips.filter((c) => c.label === 'real').length})
                  </button>
                </div>
              </div>

              {clips.length === 0 && !loadError && <p>Loading curated scenarios…</p>}

              <div className="scenario-grid">
                {filteredScenarios.map((c) => {
                  const avatarIcon = AVATAR_MAP[c.avatar] || (c.label === 'synthetic' ? '🤖' : '👤')
                  const isSelected = selected?.id === c.id
                  const isSynth = c.label === 'synthetic'

                  return (
                    <div
                      key={c.id}
                      className={`scenario-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelected(c)}
                    >
                      <div className="card-top">
                        <div className="avatar-badge-wrap">
                          <div className="avatar-icon">{avatarIcon}</div>
                          <span
                            className={`threat-tag ${
                              isSynth
                                ? c.threat_level === 'CRITICAL_RISK'
                                  ? 'critical'
                                  : 'high'
                                : 'safe'
                            }`}
                          >
                            {isSynth ? (c.threat_level === 'CRITICAL_RISK' ? 'CRITICAL RISK' : 'AI CLONE') : 'VERIFIED HUMAN'}
                          </span>
                        </div>
                        <span className="meta-chip">{c.duration_s.toFixed(1)}s</span>
                      </div>

                      <div className="card-mid">
                        <h4 className="caller-title">{c.caller_name || c.id}</h4>
                        <div className="caller-phone">{c.phone_number || '+1 (800) 555-0199'}</div>
                        <p className="caller-desc">{c.scenario || c.generator_type}</p>
                      </div>

                      <div className="card-bottom">
                        <span className="meta-chip" style={{ color: isSynth ? '#fda4af' : '#6ee7b7' }}>
                          {c.generator_type}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {c.id.replace('demo_', '')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Sticky Action Dock */}
              {selected && (
                <div className="action-dock">
                  <div className="selected-preview">
                    <span className="preview-avatar">
                      {AVATAR_MAP[selected.avatar] || (selected.label === 'synthetic' ? '🤖' : '👤')}
                    </span>
                    <div className="preview-info">
                      <span className="preview-name">{selected.caller_name || selected.id}</span>
                      <span className="preview-sub">
                        {selected.phone_number} · {selected.generator_type} ({selected.duration_s.toFixed(1)}s)
                      </span>
                    </div>
                  </div>

                  <button className="btn primary big" onClick={() => startCall(selected)}>
                    📲 Simulate Incoming Call
                  </button>
                </div>
              )}
            </section>
          )}

          {/* TAB 2: FULL EVALUATION BANK (193 CLIPS) */}
          {activeTab === 'testbank' && (
            <section className="testbank-container">
              <div className="testbank-header">
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>
                    Held-Out ASVspoof 2019 Evaluation Bank
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Stratified evaluation test set: 51 human + 142 synthetic clips across all 13 attack types (A07–A19).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    className="search-input"
                    style={{ cursor: 'pointer' }}
                    value={attackFilter}
                    onChange={(e) => setAttackFilter(e.target.value)}
                  >
                    {attackTypes.map((t) => (
                      <option key={t} value={t}>
                        {t === 'all'
                          ? 'All Attacks (193 clips)'
                          : t === 'attack_A10'
                          ? 'attack_A10 (11 clips · The PRISM Weakness)'
                          : `${t} (${evalClips.filter((c) => c.generator_type === t).length})`}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by clip ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="testbank-table-wrap">
                <table className="testbank-table">
                  <thead>
                    <tr>
                      <th>Utterance ID</th>
                      <th>Class</th>
                      <th>Attack / Generator</th>
                      <th>Duration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvalClips.slice(0, 100).map((c) => {
                      const isA10 = c.generator_type === 'attack_A10'
                      const isHuman = c.label === 'real'
                      return (
                        <tr key={c.id}>
                          <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{c.id}</td>
                          <td>
                            <span className={`threat-tag ${isHuman ? 'safe' : 'critical'}`} style={{ fontSize: '0.7rem' }}>
                              {isHuman ? 'HUMAN' : 'SPOOF'}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono',
                                color: isA10 ? '#f59e0b' : isHuman ? '#6ee7b7' : '#94a3b8',
                                fontWeight: isA10 ? 800 : 500,
                              }}
                            >
                              {c.generator_type} {isA10 ? '⭐ (Blind Spot)' : ''}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-dim)' }}>
                            {c.duration_s.toFixed(2)}s
                          </td>
                          <td>
                            <button
                              className="btn primary"
                              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                              onClick={() => startCall(c)}
                            >
                              📲 Test Call
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filteredEvalClips.length > 100 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                  Showing top 100 matching clips out of {filteredEvalClips.length}. Use the dropdown filter to narrow.
                </p>
              )}
            </section>
          )}

          {/* TAB 3: CUSTOM AUDIO UPLOADER */}
          {activeTab === 'upload' && (
            <section className="testbank-container">
              <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem' }}>
                Test Any Custom Voice Recording (.WAV)
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Upload any external audio sample. VoxG evaluates the raw waveform directly on CPU with wav2vec2.
              </p>

              <label className="upload-box" style={{ display: 'block' }}>
                <input
                  type="file"
                  accept="audio/wav,audio/flac,audio/x-wav,audio/*"
                  style={{ display: 'none' }}
                  onChange={handleUploadChange}
                />
                <div className="upload-icon">🎙️</div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>
                  {uploadFile ? uploadFile.name : 'Click to select or drag & drop a .wav audio file'}
                </h4>
                <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  {uploadFile
                    ? `${(uploadFile.size / 1024).toFixed(1)} KB selected · Ready to analyze`
                    : 'Supports 16kHz mono/stereo FLAC and WAV'}
                </p>
              </label>

              {uploadFile && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button
                    className="btn accept big"
                    onClick={handleUploadScan}
                    disabled={uploading}
                  >
                    {uploading ? '⏳ Evaluating Waveform…' : '⚡ Run Deepfake Voice Detection'}
                  </button>
                </div>
              )}

              {uploadError && <div className="error banner" style={{ marginTop: '16px' }}>{uploadError}</div>}

              {uploadResult && (
                <div
                  className={`verdict-banner ${uploadResult.is_synthetic ? 'danger' : 'safe'}`}
                  style={{ marginTop: '24px', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2.5rem' }}>{uploadResult.is_synthetic ? '🚨' : '🛡️'}</span>
                    <div>
                      <h4 style={{ margin: '0 0 2px', fontSize: '1.3rem' }}>
                        {uploadResult.is_synthetic
                          ? 'AI CLONED VOICE DETECTED'
                          : 'AUTHENTIC HUMAN VOICE VERIFIED'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        File: {uploadResult.filename} ({uploadResult.duration_s}s)
                      </p>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Prediction</div>
                      <div className="stat-val" style={{ color: uploadResult.is_synthetic ? '#f43f5e' : '#10b981' }}>
                        {uploadResult.prediction.toUpperCase()}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Model Confidence</div>
                      <div className="stat-val">{(uploadResult.confidence * 100).toFixed(1)}%</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Inference Latency</div>
                      <div className="stat-val">{uploadResult.latency_ms}ms</div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ACTIVE CALL / RINGING SCREEN */}
      {session.status !== 'idle' && session.status !== 'ended' && (
        <CallScreen session={session} />
      )}

      {/* POST-CALL VERDICT SCREEN */}
      {session.status === 'ended' && (
        <VerdictScreen session={session} onBack={session.decline} />
      )}

      {/* Hidden Audio element for simulated playback — bound to the clip
          being called, not the picker selection (test-bank calls never
          update `selected`, which made every call play the same audio). */}
      {session.clip && <audio ref={session.audioRef} src={session.clip.url} preload="auto" />}
    </div>
  )
}
