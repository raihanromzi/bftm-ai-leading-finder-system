'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { MapPin, Radio, AlertCircle, CheckCircle2 } from 'lucide-react'

const RadarMap = dynamic(() => import('./RadarMap'), { ssr: false })

type HealthStatus = 'checking' | 'ok' | 'error'

export default function RadarWorkspace() {
  const [health, setHealth] = useState<HealthStatus>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/health', { signal: AbortSignal.timeout(3000) })
        setHealth(res.ok ? 'ok' : 'error')
      } catch {
        setHealth('error')
      }
    }
    check()
    const id = setInterval(check, 10_000)
    return () => clearInterval(id)
  }, [])

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

        {/* Controls placeholder */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
              textAlign: 'center',
              color: 'var(--muted)',
            }}
          >
            <MapPin size={32} color="#D1D5DB" />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Pilih lokasi cabang</p>
            <p style={{ fontSize: 12, lineHeight: 1.5 }}>
              Klik pada peta atau pilih preset cabang Mandiri untuk memulai scan radar.
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
            style={{
              background: 'var(--navy)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            disabled
          >
            Scan
          </button>
        </div>
      </aside>

      {/* ── Map pane ── */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <RadarMap />
      </main>
    </div>
  )
}
