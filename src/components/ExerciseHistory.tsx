import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateRecommendation } from '../lib/recommendations'
import type { RepRange, SessionExercise, ExerciseSet } from '../types'

interface Props {
  clientId: string
  exerciseId: string
  exerciseName: string
  equipmentType: string | null
  onClose: () => void
}

type HistoryRow = SessionExercise & { exercise_sets: ExerciseSet[]; sessions: { session_date: string } }
type AllHistory = { '6-8': HistoryRow[]; '8-12': HistoryRow[]; '15-20': HistoryRow[] }

const RANGES: RepRange[] = ['6-8', '8-12', '15-20']
const RANGE_LABELS: Record<RepRange, string> = {
  '6-8': '6–8 Strength',
  '8-12': '8–12 Build',
  '15-20': '15–20 Endurance',
}
const RANGE_COLORS: Record<RepRange, string> = {
  '6-8': '#16a34a',
  '8-12': '#2563eb',
  '15-20': '#dc2626',
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    Increase: 'badge-increase', Hold: 'badge-hold', Reduce: 'badge-reduce',
    Underloaded: 'badge-underloaded', 'Establish Baseline': 'badge-baseline',
  }
  return `badge ${map[status] || 'badge-baseline'}`
}

interface ChartPoint { date: string; s68?: number; s812?: number; s1520?: number }

export default function ExerciseHistory({ clientId, exerciseId, exerciseName, equipmentType, onClose }: Props) {
  const [activeRange, setActiveRange] = useState<RepRange>('6-8')

  const { data: allHistory, isLoading } = useQuery({
    queryKey: ['exercise-history-all', clientId, exerciseId],
    queryFn: async (): Promise<AllHistory> => {
      const results: AllHistory = { '6-8': [], '8-12': [], '15-20': [] }
      await Promise.all(
        RANGES.map(async (range) => {
          const { data, error } = await supabase
            .from('session_exercises')
            .select('*, exercise_sets(*), sessions(session_date)')
            .eq('client_id', clientId)
            .eq('exercise_id', exerciseId)
            .eq('rep_range', range)
            .order('created_at', { ascending: true })
            .limit(20)
          if (!error && data) results[range] = data as HistoryRow[]
        })
      )
      return results
    },
  })

  const h = allHistory ?? { '6-8': [], '8-12': [], '15-20': [] }
  const activeHistory = h[activeRange]
  const rec = calculateRecommendation(activeHistory as any, activeRange, exerciseName, equipmentType)

  // Build combined chart data
  const dateMap = new Map<string, ChartPoint>()
  const keyMap: Record<RepRange, keyof ChartPoint> = { '6-8': 's68', '8-12': 's812', '15-20': 's1520' }
  RANGES.forEach((range) => {
    h[range].forEach((row) => {
      const date = row.sessions?.session_date
        ? new Date(row.sessions.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '?'
      const w = (row.weight || row.exercise_sets?.[0]?.weight || 0) as number
      if (!dateMap.has(date)) dateMap.set(date, { date })
      if (w > 0) (dateMap.get(date) as any)[keyMap[range]] = w
    })
  })
  const chartData: ChartPoint[] = Array.from(dateMap.values())
  const hasChart = chartData.length > 0 && RANGES.some(r => h[r].length > 1)

  return (
    <div className="inline-panel">
      <div className="inline-panel-header">
        <span className="inline-panel-title">{exerciseName} History</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8' }}>
          <X size={18} />
        </button>
      </div>
      <div className="inline-panel-body">
        {isLoading ? (
          <div className="loading">Loading…</div>
        ) : (
          <>
            {/* Combined chart */}
            {hasChart && (
              <>
                <div className="card-title" style={{ marginBottom: 6 }}>Progress Over Time</div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
                  {RANGES.map(r => h[r].length > 0 && (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <div style={{ width: 20, height: 3, background: RANGE_COLORS[r], borderRadius: 2 }} />
                      <span style={{ color: '#64748b', fontWeight: 500 }}>{RANGE_LABELS[r]}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: '100%', height: 200, marginBottom: 20 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} unit="lb" />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v: unknown, name: string) => {
                          const labels: Record<string, string> = { s68: '6–8', s812: '8–12', s1520: '15–20' }
                          return [`${v} lbs`, labels[name] || name]
                        }}
                      />
                      {h['6-8'].length > 0 && <Line type="monotone" dataKey="s68" stroke={RANGE_COLORS['6-8']} strokeWidth={2.5} dot={{ fill: RANGE_COLORS['6-8'], r: 3 }} activeDot={{ r: 5 }} connectNulls={false} name="s68" />}
                      {h['8-12'].length > 0 && <Line type="monotone" dataKey="s812" stroke={RANGE_COLORS['8-12']} strokeWidth={2.5} dot={{ fill: RANGE_COLORS['8-12'], r: 3 }} activeDot={{ r: 5 }} connectNulls={false} name="s812" />}
                      {h['15-20'].length > 0 && <Line type="monotone" dataKey="s1520" stroke={RANGE_COLORS['15-20']} strokeWidth={2.5} dot={{ fill: RANGE_COLORS['15-20'], r: 3 }} activeDot={{ r: 5 }} connectNulls={false} name="s1520" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* Rep range tabs */}
            <div className="card-title" style={{ marginBottom: 8 }}>Recommendation</div>
            <div className="seg-control" style={{ marginBottom: 14 }}>
              {RANGES.map(r => (
                <button
                  key={r}
                  className={`seg-btn${activeRange === r ? ' active' : ''}`}
                  onClick={() => setActiveRange(r)}
                  style={activeRange === r ? { color: RANGE_COLORS[r] } : {}}
                >
                  {r}
                </button>
              ))}
            </div>

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

            <div className="rec-card" style={{
              borderColor: RANGE_COLORS[activeRange] + '50',
              background: RANGE_COLORS[activeRange] + '08'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: RANGE_COLORS[activeRange] }}>Recommended Next</span>
                <span className={statusClass(rec.status)}>{rec.status}</span>
              </div>
              <div className="rec-weight" style={{ color: RANGE_COLORS[activeRange] }}>
                {rec.recommendedWeight != null ? `${rec.recommendedWeight} lbs` : '—'}
              </div>
              <div className="rec-reason">{rec.reason}</div>
            </div>

            {activeHistory.length > 0 && (
              <>
                <div className="card-title" style={{ marginTop: 16, marginBottom: 8 }}>
                  Recent — {RANGE_LABELS[activeRange]}
                </div>
                {[...activeHistory].reverse().slice(0, 3).map((row) => {
                  const sets = row.exercise_sets || []
                  const repsStr = sets.map((s: ExerciseSet) => s.reps).join(', ')
                  const w = row.weight || sets[0]?.weight
                  const date = row.sessions?.session_date
                    ? new Date(row.sessions.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'
                  return (
                    <div key={row.id} className="exercise-history-row">
                      <div>
                        <div className="ex-name">{date}</div>
                        <div className="ex-detail">{w ? `${w} lbs` : '—'} · {repsStr || '—'} reps</div>
                      </div>
                      {row.form && (
                        <span className="badge" style={{
                          fontSize: 11, color: RANGE_COLORS[activeRange],
                          background: RANGE_COLORS[activeRange] + '12',
                        }}>
                          {row.form}
                        </span>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            {activeHistory.length === 0 && (
              <div className="empty" style={{ padding: '20px 0' }}>
                <p>No history for {RANGE_LABELS[activeRange]} yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
