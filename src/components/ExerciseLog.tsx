import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateRecommendation } from '../lib/recommendations'
import ExerciseHistory from './ExerciseHistory'
import type { Client, Exercise, RepRange, SessionExercise, ExerciseSet } from '../types'

interface Props {
  prefill?: { exercise: Exercise; repRange: RepRange } | null
  onClearPrefill?: () => void
  client: Client
}

const EXERCISES_LIST = [
  'Leg Press', 'Leg Curl', 'Leg Extension', 'Glute Press', 'Romanian Deadlift',
  'Walking Lunge', 'Chest Press', 'Shoulder Press', 'Lat Pulldown', 'Seated Row',
  'Biceps Curl', 'Triceps Pressdown', 'Cable Row', 'Plank', 'Dead Bug'
]

const RANGES: { value: RepRange; label: string }[] = [
  { value: '6-8', label: '6–8 Strength' },
  { value: '8-12', label: '8–12 Build' },
  { value: '15-20', label: '15–20 Endurance' },
]

const EFFORT_OPTS = ['Easy', 'Challenging but good', 'Too hard']
const FORM_OPTS = ['Good', 'Okay', 'Broke down']
const PAIN_OPTS = ['No pain', 'Mild discomfort', 'Pain, stop exercise']

function statusClass(status: string) {
  const map: Record<string, string> = {
    'Increase': 'badge-increase', 'Hold': 'badge-hold', 'Reduce': 'badge-reduce',
    'Underloaded': 'badge-underloaded', 'Establish Baseline': 'badge-baseline',
  }
  return `badge ${map[status] || 'badge-baseline'}`
}

export default function ExerciseLog({ client, prefill, onClearPrefill }: Props) {
  const qc = useQueryClient()
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [repRange, setRepRange] = useState<RepRange>('6-8')
  const [sets, setSets] = useState([
    { weight: '', reps: '' },
    { weight: '', reps: '' },
    { weight: '', reps: '' },
  ])
  const [effort, setEffort] = useState('Challenging but good')
  const [form, setForm] = useState('Good')
  const [pain, setPain] = useState('No pain')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (prefill) {
      selectExerciseName(prefill.exercise.name)
      setRepRange(prefill.repRange)
      onClearPrefill?.()
    }
  }, [prefill])
  const [showDropdown, setShowDropdown] = useState(false)

  // Load exercises from DB, fall back to hardcoded list
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (error) throw error
      return data as Exercise[]
    },
  })

  // History for recommendation
  const { data: history = [] } = useQuery({
    queryKey: ['exercise-history', client.id, selectedExercise?.id, repRange],
    enabled: !!selectedExercise,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_exercises')
        .select('*, exercise_sets(*)')
        .eq('client_id', client.id)
        .eq('exercise_id', selectedExercise!.id)
        .eq('rep_range', repRange)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as (SessionExercise & { exercise_sets: ExerciseSet[] })[]
    },
  })

  const rec = selectedExercise
    ? calculateRecommendation(history as any, repRange, selectedExercise.name, selectedExercise.equipment_type)
    : null

  // Exercise list: DB + hardcoded fallback merged
  const allExerciseNames = exercises.length > 0
    ? exercises.map(e => e.name)
    : EXERCISES_LIST

  const filteredExercises = allExerciseNames.filter(name =>
    name.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  function selectExerciseName(name: string) {
    const found = exercises.find(e => e.name.toLowerCase() === name.toLowerCase())
    if (found) {
      setSelectedExercise(found)
    } else {
      // Create a stub
      setSelectedExercise({ id: '', name, equipment_type: null, main_muscle_group: null, secondary_muscle_group: null, movement_type: null, difficulty: null, notes: null, avoid_if: null, created_at: '' })
    }
    setExerciseSearch(name)
    setShowDropdown(false)
    setShowHistory(false)
  }

  function updateSet(i: number, field: 'weight' | 'reps', val: string) {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  function addSet() {
    const lastWeight = sets[sets.length - 1]?.weight || ''
    setSets(prev => [...prev, { weight: lastWeight, reps: '' }])
  }

  async function handleSave() {
    if (!selectedExercise) return
    const validSets = sets.filter(s => s.reps.trim() !== '')
    if (validSets.length === 0) { setToast('Enter at least one set.'); return }

    setSaving(true)
    try {
      // 1. Get or create today's session
      const today = new Date().toISOString().split('T')[0]
      let sessionId: string

      const { data: existing } = await supabase
        .from('sessions')
        .select('id')
        .eq('client_id', client.id)
        .eq('session_date', today)
        .single()

      if (existing) {
        sessionId = existing.id
      } else {
        const { data: newSession, error: sessErr } = await supabase
          .from('sessions')
          .insert([{ client_id: client.id, session_date: today }])
          .select('id')
          .single()
        if (sessErr) throw sessErr
        sessionId = newSession.id
      }

      // 2. Ensure exercise exists in DB
      let exerciseId = selectedExercise.id
      if (!exerciseId) {
        const { data: ex, error: exErr } = await supabase
          .from('exercises')
          .insert([{ name: selectedExercise.name }])
          .select('id')
          .single()
        if (exErr) throw exErr
        exerciseId = ex.id
      }

      const primaryWeight = parseFloat(validSets[0]?.weight || '0') || null

      // 3. Save session_exercise
      const { data: se, error: seErr } = await supabase
        .from('session_exercises')
        .insert([{
          session_id: sessionId,
          client_id: client.id,
          exercise_id: exerciseId,
          rep_range: repRange,
          weight: primaryWeight,
          effort,
          form,
          pain,
          notes: notes || null,
        }])
        .select('id')
        .single()
      if (seErr) throw seErr

      // 4. Save individual sets
      const setRows = validSets.map((s, i) => ({
        session_exercise_id: se.id,
        set_number: i + 1,
        reps: parseInt(s.reps) || null,
        weight: parseFloat(s.weight) || primaryWeight,
      }))

      const { error: setsErr } = await supabase.from('exercise_sets').insert(setRows)
      if (setsErr) throw setsErr

      // 5. Invalidate caches
      qc.invalidateQueries({ queryKey: ['exercise-history', client.id] })
      qc.invalidateQueries({ queryKey: ['sessions', client.id] })

      // 6. Reset form
      setSets([{ weight: '', reps: '' }, { weight: '', reps: '' }, { weight: '', reps: '' }])
      setNotes('')
      setEffort('Challenging but good')
      setForm('Good')
      setPain('No pain')
      setToast(`${selectedExercise.name} saved!`)
      setTimeout(() => setToast(''), 2500)
    } catch (e: any) {
      setToast(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {toast && <div className="toast">{toast}</div>}

      <div className="card">
        <div className="card-title">Log Exercise</div>

        {/* Exercise selector */}
        <div className="field" style={{ position: 'relative' }}>
          <label>Exercise</label>
          <input
            className="input"
            placeholder="Search exercises…"
            value={exerciseSearch}
            onChange={e => { setExerciseSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && exerciseSearch && filteredExercises.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
              border: '1px solid #e2e8f0', borderRadius: 8, zIndex: 50, maxHeight: 220,
              overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.1)'
            }}>
              {filteredExercises.map(name => (
                <div
                  key={name}
                  onClick={() => selectExerciseName(name)}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 15, borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rep range */}
        <div className="field">
          <label>Rep Range</label>
          <div className="seg-control">
            {RANGES.map(r => (
              <button
                key={r.value}
                className={`seg-btn${repRange === r.value ? ' active' : ''}`}
                onClick={() => setRepRange(r.value)}
              >
                {r.value}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        {rec && selectedExercise && (
          <div className="rec-card">
            <div className="flex-between mb-2">
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>Recommended Next</span>
              <span className={statusClass(rec.status)}>{rec.status}</span>
            </div>
            <div className="rec-weight">
              {rec.recommendedWeight != null ? `${rec.recommendedWeight} lbs` : '—'}
            </div>
            <div className="rec-reason">{rec.reason}</div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10, padding: '6px 0' }}
              onClick={() => setShowHistory(h => !h)}
            >
              {showHistory ? 'Hide history' : 'View full history'}
            </button>
          </div>
        )}

        {/* History panel */}
        {showHistory && selectedExercise && selectedExercise.id && (
          <ExerciseHistory
            clientId={client.id}
            exerciseId={selectedExercise.id}
            exerciseName={selectedExercise.name}
            equipmentType={selectedExercise.equipment_type}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* Sets */}
        {selectedExercise && (
          <>
            <div className="field">
              <label>Sets</label>
              <div className="sets-grid" style={{ marginBottom: 6 }}>
                <div className="set-label" />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textAlign: 'center' }}>Weight (lbs)</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textAlign: 'center' }}>Reps</div>
              </div>
              {sets.map((s, i) => (
                <div key={i} className="sets-grid" style={{ marginBottom: 6 }}>
                  <div className="set-label">Set {i + 1}</div>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    placeholder={rec?.recommendedWeight?.toString() || '0'}
                    value={s.weight}
                    onChange={e => updateSet(i, 'weight', e.target.value)}
                  />
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={s.reps}
                    onChange={e => updateSet(i, 'reps', e.target.value)}
                  />
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addSet} style={{ marginTop: 4 }}>
                <Plus size={14} /> Add Set
              </button>
            </div>

            {/* Effort */}
            <div className="field">
              <label>Effort</label>
              <div className="option-group">
                {EFFORT_OPTS.map(o => (
                  <button key={o} className={`option-btn${effort === o ? ' selected' : ''}`} onClick={() => setEffort(o)}>{o}</button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="field">
              <label>Form</label>
              <div className="option-group">
                {FORM_OPTS.map(o => (
                  <button key={o} className={`form-btn option-btn${form === o ? ' selected' : ''}`} onClick={() => setForm(o)}>{o}</button>
                ))}
              </div>
            </div>

            {/* Pain */}
            <div className="field">
              <label>Pain</label>
              <div className="option-group">
                {PAIN_OPTS.map(o => (
                  <button key={o} className={`option-btn${pain === o ? ' selected' : ''}`} onClick={() => setPain(o)}>{o}</button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Notes</label>
              <textarea className="textarea" placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving…' : 'Save Exercise'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
