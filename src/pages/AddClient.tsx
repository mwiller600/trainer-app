import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Client } from '../types'

const GOALS = [
  'Strength', 'Muscle tone', 'Fat loss', 'Endurance', 'Athletic performance',
  'Mobility', 'Injury prevention', 'Glutes', 'Abs/core', 'Back',
  'Lower body', 'Upper body', 'Total body', 'Other'
]

interface Props {
  onBack: () => void
  onSaved: (client: Client) => void
}

export default function AddClient({ onBack, onSaved }: Props) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    date_of_birth: '',
    phone: '',
    primary_goal: '',
    secondary_goal: '',
    limitations: '',
    movements_to_avoid: '',
    trainer_notes: '',
  })

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('clients')
      .insert([{
        name: form.name.trim(),
        date_of_birth: form.date_of_birth || null,
        phone: form.phone || null,
        primary_goal: form.primary_goal || null,
        secondary_goal: form.secondary_goal || null,
        limitations: form.limitations || null,
        movements_to_avoid: form.movements_to_avoid || null,
        trainer_notes: form.trainer_notes || null,
      }])
      .select()
      .single()

    setSaving(false)
    if (err) { setError(err.message); return }
    qc.invalidateQueries({ queryKey: ['clients'] })
    onSaved(data as Client)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">New Client</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="page">
        {error && <div className="error-banner">{error}</div>}

        <div className="card">
          <div className="card-title">Basic Info</div>
          <div className="field">
            <label>Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="field">
            <label>Date of Birth</label>
            <input className="input" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Phone</label>
            <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Goals</div>
          <div className="field">
            <label>Primary Goal</label>
            <select className="select" value={form.primary_goal} onChange={e => set('primary_goal', e.target.value)}>
              <option value="">Select a goal</option>
              {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Secondary Goal</label>
            <select className="select" value={form.secondary_goal} onChange={e => set('secondary_goal', e.target.value)}>
              <option value="">Select a goal</option>
              {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Notes & Limitations</div>
          <div className="field">
            <label>Limitations</label>
            <textarea className="textarea" value={form.limitations} onChange={e => set('limitations', e.target.value)} placeholder="Injuries, medical conditions…" />
          </div>
          <div className="field">
            <label>Movements to Avoid</label>
            <textarea className="textarea" value={form.movements_to_avoid} onChange={e => set('movements_to_avoid', e.target.value)} placeholder="e.g. overhead pressing, deep squats" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Trainer Notes</label>
            <textarea className="textarea" value={form.trainer_notes} onChange={e => set('trainer_notes', e.target.value)} placeholder="Any other notes" />
          </div>
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
