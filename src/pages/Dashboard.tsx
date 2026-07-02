import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, ChevronRight, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Client } from '../types'

interface Props {
  onSelectClient: (client: Client) => void
  onAddClient: () => void
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Dashboard({ onSelectClient, onAddClient }: Props) {
  const [search, setSearch] = useState('')

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Client[]
    },
  })

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="app">
      <div className="topbar">
        <Zap size={20} color="#2563eb" fill="#2563eb" />
        <div>
          <div className="topbar-title">Trainer</div>
          <div className="topbar-subtitle">Progress Tracker</div>
        </div>
      </div>

      <div className="page">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={16} />
            <input
              className="input"
              placeholder="Search clients"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={onAddClient}>
            <Plus size={16} />
            Add Client
          </button>
        </div>

        {error && (
          <div className="error-banner">
            Could not load clients. Check your Supabase connection.
          </div>
        )}

        {isLoading ? (
          <div className="loading">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <h3>{search ? 'No clients match that search' : 'No clients yet'}</h3>
            <p>{search ? 'Try a different name.' : 'Add your first client to get started.'}</p>
            {!search && (
              <button className="btn btn-primary mt-3" onClick={onAddClient}>
                <Plus size={16} /> Add Client
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="section-title">
              {search ? `Results (${filtered.length})` : 'All Clients'}
            </div>
            {filtered.map(client => (
              <div key={client.id} className="client-row" onClick={() => onSelectClient(client)}>
                <div className="client-avatar">{initials(client.name)}</div>
                <div className="client-info">
                  <div className="client-name">{client.name}</div>
                  <div className="client-meta">
                    {[client.primary_goal, client.secondary_goal].filter(Boolean).join(' · ') || 'No goals set'}
                  </div>
                </div>
                <ChevronRight size={18} color="#cbd5e1" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
