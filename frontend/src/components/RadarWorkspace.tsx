'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarCheck,
  CircleGauge,
  Compass,
  Download,
  Loader2,
  LocateFixed,
  MapPin,
  Radio,
  Trophy,
  UsersRound,
} from 'lucide-react'
import LeadsTable from './LeadsTable'
import LeadDetailDrawer, { LeadItem } from './LeadDetailDrawer'

const RadarMap = dynamic(() => import('./RadarMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#dce5e7] text-[#35516a]">
      <Loader2 size={24} className="mb-2 animate-spin text-[#007dc5]" />
      <span className="text-xs font-semibold">Menyiapkan peta radar…</span>
    </div>
  ),
})

type HealthStatus = 'checking' | 'ok' | 'error'

interface Branch {
  id: number
  name: string
  code: string
  latitude: number
  longitude: number
  city: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function RadarWorkspace() {
  const [health, setHealth] = useState<HealthStatus>('checking')
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [radius, setRadius] = useState(10)
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.193, 106.8237])
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
        setHealth(res.ok ? 'ok' : 'error')
      } catch {
        setHealth('error')
      }
    }

    checkHealth()
    const id = window.setInterval(checkHealth, 15_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await fetch(`${API_URL}/api/branches`)
        if (!res.ok) throw new Error('Daftar cabang tidak dapat dimuat.')
        const data = await res.json()
        const nextBranches = data.branches || []
        setBranches(nextBranches)
        if (nextBranches.length > 0) {
          const first = nextBranches[0]
          setSelectedBranch(first)
          setMapCenter([first.latitude, first.longitude])
        }
      } catch {
        setNotice('Daftar cabang belum tersedia. Periksa koneksi backend lalu muat ulang.')
      }
    }
    loadBranches()
  }, [])

  const stats = useMemo(() => {
    const highFit = leads.filter((lead) => lead.fit_score >= 80).length
    const scheduled = leads.filter((lead) => lead.lead_status === 'Visit Scheduled').length
    const won = leads.filter((lead) => lead.lead_status === 'Won').length
    return { highFit, scheduled, won }
  }, [leads])

  const discoverAt = async (coordinates: [number, number] = mapCenter) => {
    setLoading(true)
    setNotice('')
    try {
      const res = await fetch(`${API_URL}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: coordinates[0],
          longitude: coordinates[1],
          radius_km: radius,
        }),
      })
      if (!res.ok) throw new Error('Pemindaian tidak dapat dijalankan.')
      const data = await res.json()
      const foundLeads = data.leads || []
      setLeads(foundLeads)
      setNotice(
        foundLeads.length
          ? `${foundLeads.length} prospek ditemukan dalam radius ${radius} km.`
          : 'Tidak ada prospek pada radius ini. Pindahkan titik atau perluas radius.'
      )
    } catch {
      setNotice('Pemindaian gagal. Periksa koneksi backend, lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = () => discoverAt()

  const handleLocationChange = (coordinates: [number, number]) => {
    setMapCenter(coordinates)
    setSelectedLead(null)
    setIsDrawerOpen(false)
    setLeads([])
    discoverAt(coordinates)
  }

  const handleStatusChange = async (leadId: number, status: string) => {
    const previousLead = leads.find((lead) => lead.id === leadId)
    setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, lead_status: status } : lead)))
    setSelectedLead((current) => (current?.id === leadId ? { ...current, lead_status: status } : current))

    try {
      const res = await fetch(`${API_URL}/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Status tidak tersimpan.')
    } catch {
      if (previousLead) {
        setLeads((current) => current.map((lead) => (lead.id === leadId ? previousLead : lead)))
        setSelectedLead((current) => (current?.id === leadId ? previousLead : current))
      }
      setNotice('Status belum tersimpan. Periksa koneksi lalu coba lagi.')
    }
  }

  const handleEnrich = async (leadIds: number[]) => {
    if (!leadIds.length) return
    setEnriching(true)
    setNotice('')
    try {
      const res = await fetch(`${API_URL}/api/leads/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
      })
      if (!res.ok) throw new Error('Analisis tidak dapat dijalankan.')
      const data = await res.json()
      const results = Array.isArray(data.results) ? data.results : []
      setLeads((current) =>
        current.map((lead) => {
          const enriched = results.find((result: { lead_id: number }) => result.lead_id === lead.id)
          if (!enriched) return lead
          return {
            ...lead,
            enrichment: {
              employee_or_student_count: enriched.signals?.employee_count || 100,
              current_payment_methods: enriched.signals?.current_payment || 'QRIS / Tunai',
              pitch_script_wa: enriched.pitch_wa,
              pitch_script_visit: enriched.pitch_visit,
              raw_scraped_summary: enriched.signals?.news_signal || '',
            },
          }
        })
      )
      setSelectedLead((current) => {
        const enriched = results.find((result: { lead_id: number }) => result.lead_id === current?.id)
        return current && enriched
          ? {
              ...current,
              enrichment: {
                employee_or_student_count: enriched.signals?.employee_count || 100,
                current_payment_methods: enriched.signals?.current_payment || 'QRIS / Tunai',
                pitch_script_wa: enriched.pitch_wa,
                pitch_script_visit: enriched.pitch_visit,
                raw_scraped_summary: enriched.signals?.news_signal || '',
              },
            }
          : current
      })
      setNotice(`${results.length} prospek selesai dianalisis.`)
    } catch {
      setNotice('Analisis gagal. Periksa koneksi backend, lalu coba lagi.')
    } finally {
      setEnriching(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads/export`)
      if (!res.ok) throw new Error('Ekspor gagal.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mandiri-radar-${selectedBranch?.code || 'bftm'}-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setNotice('CSV belum dapat diunduh. Periksa koneksi lalu coba lagi.')
    }
  }

  const selectLead = (lead: LeadItem) => {
    setSelectedLead(lead)
    setIsDrawerOpen(true)
  }

  const statusText = health === 'ok' ? 'Sistem aktif' : health === 'error' ? 'Backend terputus' : 'Memeriksa sistem'

  return (
    <div className="radar-shell min-h-[100dvh] bg-[#06192f] text-[#09233d]">
      <a href="#radar-main" className="skip-link">Lewati ke peta & prospek</a>
      <header className="radar-masthead">
        <div className="flex min-w-0 items-center gap-3">
          <div className="radar-mark" aria-hidden="true"><Compass size={19} /></div>
          <div className="min-w-0">
            <h1 className="text-pretty text-[15px] font-bold tracking-[-0.03em] text-white">BFTM Radar</h1>
            <p className="truncate text-[11px] text-[#a8c4d9]">Wilayah akuisisi Bank Mandiri</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="radar-health" aria-live="polite">
            <span className={`h-1.5 w-1.5 rounded-full ${health === 'ok' ? 'bg-[#6ee7b7]' : health === 'error' ? 'bg-[#fb7185]' : 'bg-[#f7c948]'}`} />
            <span>{statusText}</span>
          </div>
          {leads.length > 0 && (
            <button type="button" onClick={handleExport} className="radar-secondary-button hidden sm:inline-flex">
              <Download size={14} aria-hidden="true" />
              Ekspor
            </button>
          )}
          <button type="button" onClick={handleScan} disabled={loading} className="radar-scan-button">
            {loading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Radio size={15} aria-hidden="true" />}
            <span>{loading ? 'Memindai…' : 'Pindai wilayah'}</span>
          </button>
        </div>
      </header>

      <div className="radar-workspace">
        <aside className="radar-control-deck" aria-label="Pengaturan pemindaian">
          <div className="radar-deck-heading">
            <p>Area kerja</p>
            <h2>Atur titik radar</h2>
          </div>

          <div className="space-y-2">
            <label htmlFor="branch-select" className="radar-label">Kantor cabang</label>
            <div className="relative">
              <select
                id="branch-select"
                name="branch"
                autoComplete="off"
                value={selectedBranch?.id || ''}
                onChange={(event) => {
                  const branch = branches.find((item) => item.id === Number(event.target.value))
                  if (!branch) return
                  setSelectedBranch(branch)
                  setMapCenter([branch.latitude, branch.longitude])
                }}
                className="radar-select"
              >
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.city})</option>)}
              </select>
              <Building2 size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#577087]" aria-hidden="true" />
            </div>
          </div>

          <div className="radar-coordinate" aria-label="Koordinat pemindaian saat ini">
            <LocateFixed size={15} aria-hidden="true" />
            <div>
              <span>Titik pemindaian</span>
              <output>{mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)}</output>
            </div>
          </div>

          <div className="radar-radius-block">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="radius-slider" className="radar-label">Jangkauan radar</label>
              <output className="radar-radius-value">{radius} km</output>
            </div>
            <input
              id="radius-slider"
              name="radius"
              type="range"
              min="1"
              max="25"
              step="1"
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="mt-3 w-full"
            />
            <div className="mt-2 flex justify-between text-[10px] font-semibold text-[#668096]"><span>1 km</span><span>25 km</span></div>
          </div>

          <dl className="radar-ledger" aria-label="Ringkasan prospek">
            <div><dt><UsersRound size={14} aria-hidden="true" /> Prospek</dt><dd>{leads.length}</dd></div>
            <div><dt><CircleGauge size={14} aria-hidden="true" /> Prioritas</dt><dd>{stats.highFit}</dd></div>
            <div><dt><CalendarCheck size={14} aria-hidden="true" /> Kunjungan</dt><dd>{stats.scheduled}</dd></div>
            <div><dt><Trophy size={14} aria-hidden="true" /> Closing</dt><dd>{stats.won}</dd></div>
          </dl>

          <p className="radar-tip"><MapPin size={14} aria-hidden="true" /> Klik peta untuk memindahkan pusat pemindaian. Tombol Pindai wilayah memakai titik tersebut.</p>
        </aside>

        <main id="radar-main" className="radar-main" tabIndex={-1}>
          <section className="radar-map-section" aria-labelledby="territory-heading">
            <div className="radar-map-title">
              <div>
                <p>Teritori aktif</p>
                <h2 id="territory-heading">{selectedBranch?.city || 'Jakarta'} · radius {radius} km</h2>
              </div>
              <span><span className="radar-signal" aria-hidden="true" />Peta langsung</span>
            </div>
            <RadarMap center={mapCenter} radiusKm={radius} leads={leads} selectedLeadId={selectedLead?.id} onLocationChange={handleLocationChange} onSelectLead={selectLead} />
          </section>

          <section className="radar-lead-section" aria-labelledby="lead-ledger-heading">
            <div className="radar-section-heading">
              <div>
                <p>Ledger lapangan</p>
                <h2 id="lead-ledger-heading">Prospek terdeteksi</h2>
              </div>
              {leads.length > 0 && <span>{leads.length} entitas</span>}
            </div>
            <LeadsTable leads={leads} selectedLeadId={selectedLead?.id} onSelectLead={selectLead} onStatusChange={handleStatusChange} onEnrich={handleEnrich} onExport={handleExport} isEnriching={enriching} />
          </section>
        </main>
      </div>

      <p className="sr-only" aria-live="polite">{notice}</p>
      <LeadDetailDrawer lead={selectedLead} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onStatusChange={handleStatusChange} onEnrichLead={(id) => handleEnrich([id])} isEnriching={enriching} />
    </div>
  )
}
