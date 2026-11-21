'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarCheck,
  ChevronRight,
  CircleGauge,
  Compass,
  Download,
  Factory,
  GraduationCap,
  Heart,
  Loader2,
  LocateFixed,
  MapPin,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import LeadDetailDrawer, { LeadItem } from './LeadDetailDrawer'

const RadarMap = dynamic(() => import('./RadarMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-500">
      <Loader2 size={22} className="mb-2 animate-spin text-blue-600" />
      <span className="text-sm">Menyiapkan peta…</span>
    </div>
  ),
})

type HealthStatus = 'checking' | 'ok' | 'error'
type FilterId = 'all' | 'education' | 'retail' | 'industry'

interface Branch {
  id: number
  name: string
  code: string
  latitude: number
  longitude: number
  city: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const filters: Array<{ id: FilterId; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'Semua prospek', icon: MapPin },
  { id: 'education', label: 'Sekolah & kampus', icon: GraduationCap },
  { id: 'retail', label: 'Ritel & F&B', icon: Store },
  { id: 'industry', label: 'Industri', icon: Factory },
]

function matchesFilter(lead: LeadItem, filter: FilterId) {
  const category = lead.category.toLowerCase()
  if (filter === 'education') return /school|sekolah|univ|kampus/.test(category)
  if (filter === 'retail') return /convenience|store|market|ritel|cafe|coffee|rest/.test(category)
  if (filter === 'industry') return /factory|pabrik|industri/.test(category)
  return true
}

function productColor(product: string) {
  const value = product.toLowerCase()
  if (value.includes('merchant') || value.includes('edc')) return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (value.includes('simpel') || value.includes('payroll')) return 'bg-blue-50 text-blue-700 ring-blue-200'
  return 'bg-violet-50 text-violet-700 ring-violet-200'
}

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
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
        setHealth(response.ok ? 'ok' : 'error')
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
        const response = await fetch(`${API_URL}/api/branches`)
        if (!response.ok) throw new Error('Branches unavailable')
        const nextBranches: Branch[] = (await response.json()).branches || []
        setBranches(nextBranches)
        if (nextBranches[0]) {
          setSelectedBranch(nextBranches[0])
          setMapCenter([nextBranches[0].latitude, nextBranches[0].longitude])
        }
      } catch {
        setNotice('Daftar cabang belum tersedia. Periksa koneksi backend lalu muat ulang.')
      }
    }
    loadBranches()
  }, [])

  const visibleLeads = useMemo(() => {
    const search = query.trim().toLowerCase()
    return leads.filter((lead) => {
      if (!matchesFilter(lead, activeFilter)) return false
      return !search || [lead.name, lead.address, lead.recommended_product].some((value) => value.toLowerCase().includes(search))
    })
  }, [activeFilter, leads, query])

  const stats = useMemo(() => ({
    priority: leads.filter((lead) => lead.fit_score >= 80).length,
    scheduled: leads.filter((lead) => lead.lead_status === 'Visit Scheduled').length,
    won: leads.filter((lead) => lead.lead_status === 'Won').length,
  }), [leads])

  const discoverAt = async (coordinates: [number, number] = mapCenter) => {
    setLoading(true)
    setNotice('')
    try {
      const response = await fetch(`${API_URL}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: coordinates[0], longitude: coordinates[1], radius_km: radius }),
      })
      if (!response.ok) throw new Error('Discovery failed')
      const foundLeads: LeadItem[] = (await response.json()).leads || []
      setLeads(foundLeads)
      setNotice(foundLeads.length ? `${foundLeads.length} prospek ditemukan dalam radius ${radius} km.` : 'Tidak ada prospek pada radius ini. Pindahkan titik atau perluas radius.')
    } catch {
      setNotice('Pemindaian gagal. Periksa koneksi backend, lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleLocationChange = (coordinates: [number, number]) => {
    setMapCenter(coordinates)
    setSelectedLead(null)
    setIsDrawerOpen(false)
    setLeads([])
    discoverAt(coordinates)
  }

  const handleStatusChange = async (leadId: number, status: string) => {
    const previous = leads.find((lead) => lead.id === leadId)
    setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, lead_status: status } : lead))
    setSelectedLead((current) => current?.id === leadId ? { ...current, lead_status: status } : current)
    try {
      const response = await fetch(`${API_URL}/api/leads/${leadId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!response.ok) throw new Error('Status save failed')
    } catch {
      if (previous) {
        setLeads((current) => current.map((lead) => lead.id === leadId ? previous : lead))
        setSelectedLead((current) => current?.id === leadId ? previous : current)
      }
      setNotice('Status belum tersimpan. Periksa koneksi lalu coba lagi.')
    }
  }

  const handleEnrich = async (leadIds: number[]) => {
    if (!leadIds.length) return
    setEnriching(true)
    try {
      const response = await fetch(`${API_URL}/api/leads/enrich`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: leadIds }) })
      if (!response.ok) throw new Error('Enrichment failed')
      const data = await response.json()
      const results = Array.isArray(data.results) ? data.results : []
      const withEnrichment = (lead: LeadItem) => {
        const enriched = results.find((result: { lead_id: number }) => result.lead_id === lead.id)
        return !enriched ? lead : { ...lead, enrichment: { employee_or_student_count: enriched.signals?.employee_count || 100, current_payment_methods: enriched.signals?.current_payment || 'QRIS / Tunai', pitch_script_wa: enriched.pitch_wa, pitch_script_visit: enriched.pitch_visit, raw_scraped_summary: enriched.signals?.news_signal || '' } }
      }
      setLeads((current) => current.map(withEnrichment))
      setSelectedLead((current) => current ? withEnrichment(current) : current)
      setNotice(`${results.length} prospek selesai dianalisis.`)
    } catch {
      setNotice('Analisis gagal. Periksa koneksi backend, lalu coba lagi.')
    } finally {
      setEnriching(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/api/leads/export`)
      if (!response.ok) throw new Error('Export failed')
      const url = URL.createObjectURL(await response.blob())
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

  return (
    <div className="map-shell">
      <a href="#radar-map" className="skip-link">Lewati ke peta</a>
      <aside className="map-rail" aria-label="Navigasi radar">
        <div className="map-brand"><Compass size={20} aria-hidden="true" /></div>
        <nav className="map-rail-nav" aria-label="Tampilan workspace">
          <button type="button" className="map-rail-button is-active" aria-label="Prospek di peta"><MapPin size={18} aria-hidden="true" /></button>
          <button type="button" className="map-rail-button" aria-label="Prospek prioritas" onClick={() => setActiveFilter('all')}><Heart size={18} aria-hidden="true" /></button>
          <button type="button" className="map-rail-button" aria-label="Filter dan jangkauan" onClick={() => document.getElementById('radar-radius')?.focus()}><SlidersHorizontal size={18} aria-hidden="true" /></button>
        </nav>
        <div className="map-rail-status" title={health === 'ok' ? 'Backend terhubung' : 'Backend belum terhubung'}><span className={health === 'ok' ? 'is-online' : ''} /></div>
      </aside>

      <section className="map-list-panel" aria-label="Daftar prospek">
        <header className="map-list-header">
          <div>
            <h1>BFTM Radar</h1>
            <p>{selectedBranch?.city || 'Wilayah cabang'} · {radius} km</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleExport} disabled={!leads.length} aria-label="Ekspor prospek CSV"><Download size={15} /></Button>
        </header>

        <div className="map-branch-control">
          <label htmlFor="branch-select">Kantor cabang</label>
          <select id="branch-select" name="branch" autoComplete="off" value={selectedBranch?.id || ''} onChange={(event) => {
            const branch = branches.find((item) => item.id === Number(event.target.value))
            if (!branch) return
            setSelectedBranch(branch)
            setMapCenter([branch.latitude, branch.longitude])
          }}>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.city})</option>)}
          </select>
          <div className="map-radius-row">
            <label htmlFor="radar-radius">Jangkauan <strong>{radius} km</strong></label>
            <input id="radar-radius" name="radius" type="range" min="1" max="25" step="1" value={radius} onChange={(event) => setRadius(Number(event.target.value))} />
          </div>
          <Button onClick={() => discoverAt()} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : <Radio />}{loading ? 'Memindai…' : 'Pindai wilayah'}
          </Button>
        </div>

        <div className="map-search-wrap">
          <Search size={16} aria-hidden="true" />
          <input type="search" name="lead-search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari prospek…" aria-label="Cari prospek" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Hapus pencarian"><X size={14} /></button>}
        </div>

        <nav className="map-filter-list" aria-label="Filter kategori">
          {filters.map(({ id, label, icon: Icon }) => {
            const count = leads.filter((lead) => matchesFilter(lead, id)).length
            return <button key={id} type="button" className={activeFilter === id ? 'is-active' : ''} onClick={() => setActiveFilter(id)}><Icon size={15} aria-hidden="true" /><span>{label}</span><strong>{count}</strong></button>
          })}
        </nav>

        <div className="map-list-title"><div><h2>Prospek terdeteksi</h2><p>{visibleLeads.length} dari {leads.length} entitas</p></div><span>{stats.priority} prioritas</span></div>
        <div className="map-lead-scroll">
          {!leads.length ? <div className="map-empty"><MapPin size={20} /><strong>Belum ada prospek</strong><p>Pilih cabang, atur jangkauan, lalu pindai wilayah.</p></div> : visibleLeads.map((lead) => (
            <article key={lead.id} className={`map-lead-card ${selectedLead?.id === lead.id ? 'is-selected' : ''}`}>
              <button type="button" className="map-lead-open" onClick={() => selectLead(lead)} aria-label={`Buka detail ${lead.name}`}>
                <span className="map-lead-icon"><Building2 size={17} /></span>
                <span className="min-w-0 flex-1 text-left"><strong>{lead.name}</strong><small>{lead.address}</small></span>
                <span className="map-score">{lead.fit_score}%</span>
              </button>
              <div className="map-lead-meta"><span className={`map-product ${productColor(lead.recommended_product)}`}>{lead.recommended_product.split('&')[0].trim()}</span>{lead.enrichment?.pitch_script_wa && <span className="map-enriched"><Sparkles size={12} /> Diperkaya</span>}</div>
              <div className="map-lead-actions"><Button variant="outline" size="sm" onClick={() => selectLead(lead)}>Lihat naskah <ChevronRight /></Button>{!lead.enrichment?.pitch_script_wa && <Button variant="ghost" size="sm" onClick={() => handleEnrich([lead.id])} disabled={enriching}>{enriching ? <Loader2 className="animate-spin" /> : <Sparkles />} Deep-dive</Button>}</div>
            </article>
          ))}
        </div>
        <footer className="map-list-footer"><span><CircleGauge size={14} /> {stats.priority} prioritas</span><span><CalendarCheck size={14} /> {stats.scheduled} kunjungan</span><span><Trophy size={14} /> {stats.won} closing</span></footer>
      </section>

      <main id="radar-map" className="map-canvas" tabIndex={-1}>
        <RadarMap center={mapCenter} radiusKm={radius} leads={visibleLeads} selectedLeadId={selectedLead?.id} onLocationChange={handleLocationChange} onSelectLead={selectLead} />
        <div className="map-canvas-location"><LocateFixed size={15} /><span>{mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)}</span></div>
      </main>

      <p className="sr-only" aria-live="polite">{notice}</p>
      <LeadDetailDrawer lead={selectedLead} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onStatusChange={handleStatusChange} onEnrichLead={(id) => handleEnrich([id])} isEnriching={enriching} />
    </div>
  )
}
