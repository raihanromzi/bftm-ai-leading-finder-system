'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarCheck,
  ChevronRight,
  CircleGauge,
  Download,
  Factory,
  GraduationCap,
  Loader2,
  LocateFixed,
  MapPin,
  Radio,
  RotateCcw,
  Search,
  Store,
  Trophy,
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
  if (value.includes('merchant') || value.includes('edc')) return 'is-merchant'
  if (value.includes('simpel') || value.includes('payroll')) return 'is-payroll'
  return 'is-campus'
}

function leadDistanceKm(lead: LeadItem, center: [number, number]) {
  const [originLat, originLng] = center
  const latDistance = (lead.latitude - originLat) * 111.32
  const lngDistance = (lead.longitude - originLng) * 111.32 * Math.cos((originLat * Math.PI) / 180)
  return Math.max(0.1, Math.hypot(latDistance, lngDistance)).toFixed(1)
}

export default function RadarWorkspace() {
  const [health, setHealth] = useState<HealthStatus>('checking')
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [radius, setRadius] = useState(3)
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [loading, setLoading] = useState(false)
  const [enrichingIds, setEnrichingIds] = useState<Set<number>>(new Set())
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2249, 106.8145])
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null)
  const [hoveredLead, setHoveredLead] = useState<LeadItem | null>(null)
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
    return leads.filter((lead) => matchesFilter(lead, activeFilter) && (!search || [lead.name, lead.address, lead.recommended_product].some((value) => value.toLowerCase().includes(search))))
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Discovery failed')
      }
      const foundLeads: LeadItem[] = (await response.json()).leads || []
      setLeads(foundLeads)
      setNotice(foundLeads.length ? `${foundLeads.length} prospek ditemukan dalam radius ${radius} km.` : 'Tidak ada prospek pada radius ini. Pindahkan titik atau perluas radius.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Pemindaian gagal. Periksa koneksi backend, lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleLocationChange = (coordinates: [number, number]) => {
    setMapCenter(coordinates)
    setSelectedLead(null)
    setHoveredLead(null)
    setIsDrawerOpen(false)
    setLeads([])
    discoverAt(coordinates)
  }

  const isCustomLocation = useMemo(() => {
    if (!selectedBranch) return false
    return (
      Math.abs(mapCenter[0] - selectedBranch.latitude) > 0.0005 ||
      Math.abs(mapCenter[1] - selectedBranch.longitude) > 0.0005
    )
  }, [mapCenter, selectedBranch])

  const resetToBranch = () => {
    if (selectedBranch) {
      handleLocationChange([selectedBranch.latitude, selectedBranch.longitude])
    }
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
    setEnrichingIds((prev) => new Set([...prev, ...leadIds]))
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
      setHoveredLead((current) => current ? withEnrichment(current) : current)
      setNotice(`${results.length} prospek selesai dianalisis.`)
    } catch {
      setNotice('Analisis gagal. Periksa koneksi backend, lalu coba lagi.')
    } finally {
      setEnrichingIds((prev) => { const next = new Set(prev); leadIds.forEach((id) => next.delete(id)); return next })
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

  const openLeadDetail = (lead: LeadItem) => {
    setSelectedLead(lead)
    setHoveredLead(null)
    setIsDrawerOpen(true)
  }

  const panelLead = hoveredLead && !isDrawerOpen ? hoveredLead : null

  return (
    <div className="radar-workspace">
      <a href="#radar-map" className="skip-link">Lewati ke peta</a>
      <main id="radar-map" className="radar-map-canvas" tabIndex={-1}>
        <RadarMap
          center={mapCenter}
          radiusKm={radius}
          leads={visibleLeads}
          selectedLeadId={selectedLead?.id}
          onLocationChange={handleLocationChange}
          onHoverLead={setHoveredLead}
          onSelectLead={openLeadDetail}
        />
        <div className="radar-map-location"><LocateFixed size={15} /><span>{mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)}</span></div>
      </main>

      <section className="radar-sidebar" aria-label="Daftar prospek">
        <header className="radar-sidebar-header">
          <div>
            <div className="flex items-center gap-2"><h1>BFTM Radar</h1><span className={`radar-live is-${health}`}>{health === 'ok' ? 'LIVE' : health === 'error' ? 'OFFLINE' : 'CEK'}</span></div>
            <p>{selectedBranch?.city || 'Wilayah cabang'} <span>·</span> <strong>{radius} km</strong></p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleExport} disabled={!leads.length} aria-label="Ekspor prospek CSV"><Download size={17} /></Button>
        </header>

        <div className="radar-sidebar-scroll">
          <section className="radar-control-section">
            <div className="radar-branch-card">
              <div className="radar-branch-icon" aria-hidden="true">
                <Building2 size={18} />
              </div>
              <div className="radar-branch-info min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="radar-branch-tag">Pusat Pangkalan BFTM</span>
                  {isCustomLocation && (
                    <button
                      type="button"
                      className="radar-reset-btn"
                      onClick={resetToBranch}
                      title="Kembali ke koordinat Wisma Danantara"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
                <h2 className="radar-branch-name">{selectedBranch?.name || 'Bank Mandiri KC Wisma Danantara'}</h2>
                <p className="radar-branch-address">Wisma Danantara (ex Plaza Mandiri) · Kav. 36–38, Jaksel</p>
              </div>
            </div>
            <div className="radar-radius-row">
              <label htmlFor="radar-radius">Jangkauan</label><output>{radius} km</output>
            </div>
            <input
              id="radar-radius"
              name="radius"
              type="range"
              min="1"
              max="5"
              step="1"
              value={radius}
              style={{ '--slider-fill': `${((radius - 1) / 4) * 100}%` } as React.CSSProperties}
              onChange={(event) => setRadius(Number(event.target.value))}
            />
            <Button onClick={() => discoverAt()} disabled={loading} className="radar-primary-button w-full">
              {loading ? <Loader2 className="animate-spin" /> : <Radio />}{loading ? 'Memindai…' : 'Pindai wilayah'}
            </Button>
          </section>

          <section className="radar-filter-section">
            <div className="radar-search-wrap">
              <Search size={18} aria-hidden="true" />
              <input type="search" name="lead-search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari prospek…" aria-label="Cari prospek" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Hapus pencarian"><X size={15} /></button>}
            </div>
            <nav className="radar-filter-grid" aria-label="Filter kategori">
              {filters.map(({ id, label, icon: Icon }) => {
                const count = leads.filter((lead) => matchesFilter(lead, id)).length
                return <button key={id} type="button" className={activeFilter === id ? 'is-active' : ''} onClick={() => setActiveFilter(id)}><Icon size={15} aria-hidden="true" /><span>{label}</span><strong>{count}</strong></button>
              })}
            </nav>
          </section>

          <section className="radar-results-heading"><div><h2>Prospek terdeteksi</h2><p>{visibleLeads.length} dari {leads.length} entitas</p></div><span>{stats.priority} prioritas</span></section>
          <section className="radar-results-list" aria-label="Hasil prospek">
            {!leads.length ? <div className="radar-empty"><MapPin size={22} /><strong>Belum ada prospek</strong><p>Pilih cabang, atur jangkauan, lalu pindai wilayah.</p></div> : visibleLeads.map((lead) => (
              <article key={lead.id} className={`radar-lead-card ${selectedLead?.id === lead.id ? 'is-selected' : ''}`}>
                <button type="button" className="radar-lead-summary" onClick={() => openLeadDetail(lead)} aria-label={`Buka detail ${lead.name}`}>
                  <span className="radar-lead-icon"><Building2 size={20} /></span>
                  <span className="min-w-0 flex-1 text-left"><strong>{lead.name}</strong><small>Area sekitar titik pemindaian ({leadDistanceKm(lead, mapCenter)} km)</small></span>
                  <span className="radar-fit-score">{lead.fit_score}%</span>
                </button>
                <span className={`radar-product-tag ${productColor(lead.recommended_product)}`}>{lead.recommended_product.split('&')[0].trim()}</span>
                <div className="radar-lead-actions"><Button variant="outline" onClick={() => openLeadDetail(lead)}>Lihat Detail <ChevronRight /></Button></div>
              </article>
            ))}
          </section>
        </div>
        <footer className="radar-sidebar-footer"><span><CircleGauge size={14} /> <strong>{stats.priority}</strong> prioritas</span><span><CalendarCheck size={14} /> <strong>{stats.scheduled}</strong> kunjungan</span><span><Trophy size={14} /> <strong>{stats.won}</strong> closing</span></footer>
      </section>

      {panelLead && <aside className="radar-hover-card" onMouseLeave={() => setHoveredLead(null)} aria-label={`Ringkasan ${panelLead.name}`}>
        <button type="button" className="radar-hover-close" onClick={() => setHoveredLead(null)} aria-label="Tutup ringkasan"><X size={18} /></button>
        <div className="radar-hover-meta"><span>{panelLead.category}</span><strong>{panelLead.fit_score}% Fit</strong></div>
        <h2>{panelLead.name}</h2>
        <p><MapPin size={16} /> Area sekitar titik pemindaian ({leadDistanceKm(panelLead, mapCenter)} km)</p>
        <div className="radar-hover-product">{panelLead.recommended_product}</div>
        <Button className="radar-primary-button w-full" onClick={() => openLeadDetail(panelLead)}>Lihat Detail</Button>
      </aside>}

      <p className="sr-only" aria-live="polite">{notice}</p>
      <LeadDetailDrawer lead={selectedLead} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onStatusChange={handleStatusChange} onEnrichLead={(id) => handleEnrich([id])} isEnriching={selectedLead ? enrichingIds.has(selectedLead.id) : false} />
    </div>
  )
}
