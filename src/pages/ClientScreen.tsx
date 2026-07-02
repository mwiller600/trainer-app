import { useState } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import ExerciseLog from '../components/ExerciseLog'
import SessionHistory from '../components/SessionHistory'
import type { Client } from '../types'

interface Props {
  client: Client
  onBack: () => void
}

function age(dob: string | null) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function ClientScreen({ client, onBack }: Props) {
  const [showProfile, setShowProfile] = useState(false)
  const clientAge = age(client.date_of_birth)

  return (
    <div className="app">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">{client.name}</div>
          {client.primary_goal && (
            <div className="topbar-subtitle">{client.primary_goal}</div>
          )}
        </div>
      </div>

      <div className="page">
        {/* Client profile card - collapsible */}
        <div className="card" style={{ marginBottom: 12 }}>
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
                {[
                  clientAge ? `Age ${clientAge}` : null,
                  client.primary_goal,
                  client.secondary_goal
                ].filter(Boolean).join(' · ')}
              </div>
            </div>
            {showProfile ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
          </button>

          {showProfile && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              {client.limitations && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Limitations · </span>
                  <span style={{ fontSize: 13, color: '#334155' }}>{client.limitations}</span>
                </div>
              )}
              {client.movements_to_avoid && (
                <div style={{ marginBottom: 8 }}>
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
              {!client.limitations && !client.movements_to_avoid && !client.trainer_notes && (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>No notes added.</div>
              )}
            </div>
          )}
        </div>

        <ExerciseLog client={client} />

        <div style={{ marginTop: 24 }}>
          <SessionHistory client={client} />
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
