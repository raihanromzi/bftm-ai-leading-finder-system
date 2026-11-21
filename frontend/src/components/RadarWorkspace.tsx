'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { MapPin, Radio, AlertCircle, CheckCircle2, Loader } from 'lucide-react'
import LeadsTable from './LeadsTable'

const RadarMap = dynamic(() => import('./RadarMap'), { ssr: false })

type HealthStatus = 'checking' | 'ok' | 'error'

interface Branch {
  id: number
  name: string
  code: string
  latitude: number
  longitude: number
  city: string
}

interface Lead {
  id: number
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  phone_number: string
  website: string
  recommended_product: string
  pitch_angle: string
  fit_score: number
  lead_status: string
}

export default function RadarWorkspace() {
  const [health, setHealth] = useState<HealthStatus>('checking')
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [radius, setRadius] = useState(10)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-2.5489, 118.0149])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`, {
          signal: AbortSignal.timeout(3000),
        })
        setHealth(res.ok ? 'ok' : 'error')
      } catch {
        setHealth('error')
      }
    }

    checkHealth()
    const id = setInterval(checkHealth, 10_000)
    return () => clearInterval(id)
  }, [API_URL])

  // Load branches on mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await fetch(`${API_URL}/api/branches`)
        const data = await res.json()
        setBranches(data.branches || [])
        if (data.branches?.[0]) {
          setSelectedBranch(data.branches[0])
          setMapCenter([data.branches[0].latitude, data.branches[0].longitude])
        }
      } catch (err) {
        console.error('Failed to load branches:', err)
      }
    }
    loadBranches()
  }, [API_URL])

  const handleScan = async () => {
    if (!selectedBranch) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: selectedBranch.latitude,
          longitude: selectedBranch.longitude,
          radius_km: radius,
        }),
      })
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (err) {
      console.error('Discovery failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (leadId: number, status: string) => {
    try {
      await fetch(`${API_URL}/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      // Update local state
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, lead_status: status } : l)))
    } catch (err) {
      console.error('Status update failed:', err)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads/export`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mandiri-radar-${selectedBranch?.code || 'export'}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 320,
          minWidth: 320,
          background: '#fff',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'var(--navy)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Radio size={16} color="var(--gold)" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em' }}>
                BFTM Radar
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Mandiri Lead Finder</p>
            </div>
          </div>
        </div>

        {/* Backend health */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {health === 'checking' && (
              <>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB' }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Memeriksa server…</span>
              </>
            )}
            {health === 'ok' && (
              <>
                <CheckCircle2 size={14} color="#16A34A" />
                <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>Backend terhubung</span>
              </>
            )}
            {health === 'error' && (
              <>
                <AlertCircle size={14} color="#DC2626" />
                <span style={{ fontSize: 12, color: '#DC2626' }}>Backend tidak aktif</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>— jalankan di :8000</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Branch selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>
              Pilih Cabang Mandiri
            </label>
            <select
              value={selectedBranch?.id || ''}
              onChange={(e) => {
                const branch = branches.find((b) => b.id === parseInt(e.target.value))
                if (branch) {
                  setSelectedBranch(branch)
                  setMapCenter([branch.latitude, branch.longitude])
                }
              }}
              style={{
                width: '100%',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Radius slider */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>
              Radius Pencarian
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="1"
                max="25"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                style={{ flex: 1, height: '6px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)', minWidth: '30px' }}>
                {radius} km
              </span>
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding: '12px', background: '#F3F4F6', borderRadius: '6px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--navy)', fontWeight: 500, marginBottom: '4px' }}>
              Leads ditemukan: {leads.length}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {leads.filter((l) => l.lead_status === 'New').length} baru |{' '}
              {leads.filter((l) => l.lead_status === 'Contacted').length} dihubungi |{' '}
              {leads.filter((l) => l.lead_status === 'Won').length} menang
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Scan Radar</span>
          <button
            className="btn"
            onClick={handleScan}
            disabled={!selectedBranch || loading}
            style={{
              background: 'var(--navy)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 160ms var(--ease-out)',
            }}
          >
            {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Scan'}
          </button>
        </div>
      </aside>

      {/* ── Main area: Map + Table ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Map */}
        <div style={{ flex: leads.length > 0 ? '45%' : '100%', position: 'relative', borderBottom: leads.length > 0 ? '1px solid #E5E7EB' : 'none', transition: 'flex 300ms var(--ease-out)' }}>
          <RadarMap center={mapCenter} leads={leads} />
        </div>

        {/* Table (if leads exist) */}
        {leads.length > 0 && (
          <div style={{ flex: '55%', overflow: 'hidden' }}>
            <LeadsTable
              leads={leads}
              onStatusChange={handleStatusChange}
              onExport={handleExport}
              onEnrich={(ids) => console.log('Enriching:', ids)}
            />
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
