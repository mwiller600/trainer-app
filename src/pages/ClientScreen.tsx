import { useState } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import ExerciseLog from '../components/ExerciseLog'
import SessionHistory from '../components/SessionHistory'
import SessionPlanner from '../components/SessionPlanner'
import type { Client, Exercise, RepRange } from '../types'

interface Props {
  client: Client
  onBack: () => void
}

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

type Tab = 'plan' | 'log' | 'history'

export default function ClientScreen({ client, onBack }: Props) {
  const [showProfile, setShowProfile] = useState(false)
  const [tab, setTab] = useState<Tab>('plan')
  const [prefillExercise, setPrefillExercise] = useState<{ exercise: Exercise; repRange: RepRange } | null>(null)
  const clientAge = age(client.date_of_birth)

  function handleStartLogging(exercise: Exercise, repRange: RepRange) {
    setPrefillExercise({ exercise, repRange })
    setTab('log')
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">{client.name}</div>
          {client.primary_goal && <div className="topbar-subtitle">{client.primary_goal}</div>}
        </div>
      </div>

      <div className="page">
        {/* Collapsible client profile */}
        <div className="card" style={{ marginBottom: 14 }}>
          <button
            onClick={() => setShowProfile(p => !p)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{client.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {[clientAge ? `Age ${clientAge}` : null, client.primary_goal, client.secondary_goal]
                  .filter(Boolean).join(' · ')}
              </div>
            </div>
            {showProfile ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
          </button>
          {showProfile && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              {client.limitations && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Limitations · </span>
                  <span style={{ fontSize: 13, color: '#334155' }}>{client.limitations}</span>
                </div>
              )}
              {client.movements_to_avoid && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Avoid · </span>
                  <span style={{ fontSize: 13, color: '#334155' }}>{client.movements_to_avoid}</span>
                </div>
              )}
              {client.trainer_notes && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Notes · </span>
                  <span style={{ fontSize: 13, color: '#334155' }}>{client.trainer_notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', background: '#f1f5f9', borderRadius: 10,
          padding: 3, marginBottom: 16, gap: 2
        }}>
          {([
            { id: 'plan', label: "Today's Plan" },
            { id: 'log',  label: 'Log Exercise' },
            { id: 'history', label: 'History' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: tab === t.id ? 'white' : 'none',
                color: tab === t.id ? '#2563eb' : '#64748b',
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'plan' && (
          <SessionPlanner client={client} onStartLogging={handleStartLogging} />
        )}

        {tab === 'log' && (
          <ExerciseLog client={client} prefill={prefillExercise} onClearPrefill={() => setPrefillExercise(null)} />
        )}

        {tab === 'history' && (
          <SessionHistory client={client} />
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
