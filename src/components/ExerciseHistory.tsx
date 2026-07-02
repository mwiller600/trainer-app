import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateRecommendation } from '../lib/recommendations'
import type { RepRange, SessionExercise, ExerciseSet, Exercise } from '../types'

interface Props {
  clientId: string
  exerciseId: string
  exerciseName: string
  equipmentType: string | null
  onClose: () => void
}

const RANGES: RepRange[] = ['6-8', '8-12', '15-20']
const RANGE_LABELS: Record<RepRange, string> = {
  '6-8': '6–8 Reps',
  '8-12': '8–12 Reps',
  '15-20': '15–20 Reps',
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    'Increase': 'badge-increase',
    'Hold': 'badge-hold',
    'Reduce': 'badge-reduce',
    'Underloaded': 'badge-underloaded',
    'Establish Baseline': 'badge-baseline',
  }
  return `badge ${map[status] || 'badge-baseline'}`
}

export default function ExerciseHistory({ clientId, exerciseId, exerciseName, equipmentType, onClose }: Props) {
  const [activeRange, setActiveRange] = useState<RepRange>('6-8')

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['exercise-history', clientId, exerciseId, activeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_exercises')
        .select('*, exercise_sets(*), sessions(session_date)')
        .eq('client_id', clientId)
        .eq('exercise_id', exerciseId)
        .eq('rep_range', activeRange)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as (SessionExercise & { exercise_sets: ExerciseSet[]; sessions: { session_date: string } })[]
    },
  })

  const rec = calculateRecommendation(
    history as any,
    activeRange,
    exerciseName,
    equipmentType
  )

  const chartData = [...history]
    .reverse()
    .map(h => ({
      date: h.sessions?.session_date
        ? new Date(h.sessions.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—',
      weight: h.weight || h.exercise_sets?.[0]?.weight || 0,
    }))
    .filter(d => d.weight > 0)

  return (
    <div className="inline-panel">
      <div className="inline-panel-header">
        <span className="inline-panel-title">{exerciseName} History</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8' }}>
          <X size={18} />
        </button>
      </div>
      <div className="inline-panel-body">
        <div className="seg-control" style={{ marginBottom: 16 }}>
          {RANGES.map(r => (
            <button
              key={r}
              className={`seg-btn${activeRange === r ? ' active' : ''}`}
              onClick={() => setActiveRange(r)}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="loading">Loading…</div>
        ) : (
          <>
            {/* Quick summary */}
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-label">Last Used</div>
                <div className="stat-value">{rec.lastUsed ? `${rec.lastUsed} lbs` : '—'}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Best Recent</div>
                <div className="stat-value" style={{ fontSize: 13 }}>{rec.bestRecent || '—'}</div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="rec-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>Recommended Next</span>
                <span className={statusClass(rec.status)}>{rec.status}</span>
              </div>
              <div className="rec-weight">
                {rec.recommendedWeight != null ? `${rec.recommendedWeight} lbs` : '—'}
              </div>
              <div className="rec-reason">{rec.reason}</div>
            </div>

            {/* Chart */}
            {chartData.length > 1 && (
              <>
                <div className="card-title" style={{ marginBottom: 8 }}>Progress</div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={36} />
                      <Tooltip
                        contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v: number) => [`${v} lbs`, 'Weight']}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ fill: '#2563eb', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* Last 3 sessions */}
            {history.length > 0 && (
              <>
                <div className="card-title" style={{ marginTop: 16, marginBottom: 8 }}>Recent Sessions</div>
                {history.slice(0, 3).map(h => {
                  const sets = h.exercise_sets || []
                  const repsStr = sets.map(s => s.reps).join(', ')
                  const w = h.weight || sets[0]?.weight
                  const date = h.sessions?.session_date
                    ? new Date(h.sessions.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'
                  return (
                    <div key={h.id} className="exercise-history-row">
                      <div>
                        <div className="ex-name">{date}</div>
                        <div className="ex-detail">{w ? `${w} lbs` : '—'} · {repsStr || '—'} reps</div>
                      </div>
                      {h.form && <span className="badge badge-hold" style={{ fontSize: 11 }}>{h.form}</span>}
                    </div>
                  )
                })}
              </>
            )}

            {history.length === 0 && (
              <div className="empty" style={{ padding: '24px 0' }}>
                <p>No history for {RANGE_LABELS[activeRange]} yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
