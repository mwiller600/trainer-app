import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateRecommendation } from '../lib/recommendations'
import type { Client, Exercise, RepRange, SessionExercise, ExerciseSet } from '../types'

interface PlannedExercise {
  exercise: Exercise
  repRange: RepRange
}

interface Props {
  client: Client
  onStartLogging: (exercise: Exercise, repRange: RepRange) => void
}

const RANGES: { value: RepRange; label: string; color: string }[] = [
  { value: '6-8',   label: '6–8 Strength',   color: '#16a34a' },
  { value: '8-12',  label: '8–12 Build',      color: '#2563eb' },
  { value: '15-20', label: '15–20 Endurance', color: '#dc2626' },
]

const EXERCISE_LIST = [
  'Leg Press','Leg Curl','Leg Extension','Glute Press','Romanian Deadlift',
  'Walking Lunge','Chest Press','Shoulder Press','Lat Pulldown','Seated Row',
  'Biceps Curl','Triceps Pressdown','Cable Row','Plank','Dead Bug'
]

function RepBadge({ range }: { range: RepRange }) {
  const r = RANGES.find(r => r.value === range)
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
      background: r?.color + '15', color: r?.color, border: `1px solid ${r?.color}30`
    }}>
      {range} reps
    </span>
  )
}

function PlanCard({ client, planned, onRemove, onLog }: {
  client: Client
  planned: PlannedExercise
  onRemove: () => void
  onLog: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const { data: history = [] } = useQuery({
    queryKey: ['plan-rec', client.id, planned.exercise.id, planned.repRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_exercises')
        .select('*, exercise_sets(*)')
        .eq('client_id', client.id)
        .eq('exercise_id', planned.exercise.id)
        .eq('rep_range', planned.repRange)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as (SessionExercise & { exercise_sets: ExerciseSet[] })[]
    },
  })

  const rec = calculateRecommendation(
    history as any, planned.repRange, planned.exercise.name, planned.exercise.equipment_type
  )

  const rangeColor = RANGES.find(r => r.value === planned.repRange)?.color || '#2563eb'

  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
      marginBottom: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)'
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: rangeColor + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Dumbbell size={16} color={rangeColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{planned.exercise.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <RepBadge range={planned.repRange} />
            {rec.recommendedWeight != null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: rangeColor }}>
                {rec.recommendedWeight} lbs
              </span>
            )}
            {rec.status !== 'Establish Baseline' && (
              <span style={{ fontSize: 11, color: '#64748b' }}>{rec.status}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px', background: '#fafbfc' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
            {rec.reason}
          </div>
          {history.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {history.slice(0, 2).map(h => {
                const sets = h.exercise_sets || []
                const repsStr = sets.map(s => s.reps).join(', ')
                const w = h.weight || sets[0]?.weight
                return (
                  <div key={h.id} style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                    Last: {w ? `${w} lbs` : '—'} × {repsStr || '—'} · {h.form || ''}
                  </div>
                )
              })}
            </div>
          )}
          <button className="btn btn-primary btn-sm btn-full" onClick={onLog}>
            Log This Exercise
          </button>
        </div>
      )}
    </div>
  )
}

export default function SessionPlanner({ client, onStartLogging }: Props) {
  const [plan, setPlan] = useState<PlannedExercise[]>([])
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRange, setSelectedRange] = useState<RepRange>('6-8')

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data } = await supabase.from('exercises').select('*').order('name')
      return (data || []) as Exercise[]
    },
  })

  const allNames = exercises.length > 0 ? exercises.map(e => e.name) : EXERCISE_LIST
  const filtered = allNames.filter(n =>
    n.toLowerCase().includes(search.toLowerCase()) &&
    !plan.some(p => p.exercise.name === n && p.repRange === selectedRange)
  )

  function addToPlan(name: string) {
    const found = exercises.find(e => e.name === name)
    const exercise: Exercise = found || {
      id: '', name, equipment_type: null, main_muscle_group: null,
      secondary_muscle_group: null, movement_type: null, difficulty: null,
      notes: null, avoid_if: null, created_at: ''
    }
    setPlan(p => [...p, { exercise, repRange: selectedRange }])
    setSearch('')
    setAdding(false)
  }

  function remove(i: number) {
    setPlan(p => p.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Today's Session</div>
        {plan.length < 7 && (
          <button className="btn btn-secondary btn-sm" onClick={() => setAdding(a => !a)}>
            <Plus size={14} /> Add Exercise
          </button>
        )}
      </div>

      {/* Add exercise panel */}
      {adding && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: 14, marginBottom: 12
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Rep Range</div>
          <div className="seg-control" style={{ marginBottom: 12 }}>
            {RANGES.map(r => (
              <button
                key={r.value}
                className={`seg-btn${selectedRange === r.value ? ' active' : ''}`}
                onClick={() => setSelectedRange(r.value)}
                style={selectedRange === r.value ? { color: r.color } : {}}
              >
                {r.value}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="Search exercises…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <div style={{
              background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
              marginTop: 6, maxHeight: 200, overflowY: 'auto'
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8' }}>No exercises found</div>
              ) : filtered.map(name => (
                <div
                  key={name}
                  onClick={() => addToPlan(name)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                    borderBottom: '1px solid #f1f5f9'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => { setAdding(false); setSearch('') }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Plan list */}
      {plan.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '24px 16px', background: '#f8fafc',
          border: '1.5px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8', fontSize: 14
        }}>
          Add exercises to plan today's session
        </div>
      ) : (
        plan.map((p, i) => (
          <PlanCard
            key={`${p.exercise.name}-${p.repRange}-${i}`}
            client={client}
            planned={p}
            onRemove={() => remove(i)}
            onLog={() => onStartLogging(p.exercise, p.repRange)}
          />
        ))
      )}
    </div>
  )
}
