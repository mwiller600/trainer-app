import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Client } from '../types'

interface Props {
  client: Client
}

interface SessionRow {
  id: string
  session_date: string
  focus: string | null
  session_exercises: {
    id: string
    rep_range: string
    weight: number | null
    form: string | null
    exercises: { name: string } | null
    exercise_sets: { reps: number | null; set_number: number }[]
  }[]
}

export default function SessionHistory({ client }: Props) {
  const [showAll, setShowAll] = useState(false)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, session_date, focus,
          session_exercises(
            id, rep_range, weight, form,
            exercises(name),
            exercise_sets(reps, set_number)
          )
        `)
        .eq('client_id', client.id)
        .order('session_date', { ascending: false })
        .limit(showAll ? 20 : 4)
      if (error) throw error
      return data as unknown as SessionRow[]
    },
  })

  if (isLoading) return <div className="loading">Loading sessions…</div>

  if (sessions.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📋</div>
        <h3>No sessions yet</h3>
        <p>Log an exercise above to start building history.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="section-title">Recent Sessions</div>
      {sessions.map(session => {
        const date = new Date(session.session_date + 'T12:00:00')
        const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

        return (
          <div key={session.id} className="card" style={{ marginBottom: 10 }}>
            <div className="session-date-label">{dateLabel}</div>
            {session.session_exercises.length === 0 ? (
              <div className="text-sm text-muted">No exercises logged.</div>
            ) : (
              session.session_exercises.map(se => {
                const sets = [...(se.exercise_sets || [])].sort((a, b) => a.set_number - b.set_number)
                const repsStr = sets.map(s => s.reps ?? '?').join(', ')
                const rangeLabel = se.rep_range === '6-8' ? '6–8' : se.rep_range === '8-12' ? '8–12' : '15–20'
                return (
                  <div key={se.id} className="exercise-history-row">
                    <div>
                      <div className="ex-name">{se.exercises?.name || 'Unknown'}</div>
                      <div className="ex-detail">
                        {rangeLabel} reps · {se.weight ? `${se.weight} lbs` : '—'}{repsStr ? ` · ${repsStr}` : ''}
                      </div>
                    </div>
                    {se.form && (
                      <span className={`badge ${se.form === 'Good' ? 'badge-hold' : se.form === 'Broke down' ? 'badge-reduce' : 'badge-baseline'}`} style={{ fontSize: 11 }}>
                        {se.form}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )
      })}

      {!showAll && (
        <button className="btn btn-secondary btn-full" onClick={() => setShowAll(true)}>
          View All Sessions
        </button>
      )}
    </div>
  )
}
