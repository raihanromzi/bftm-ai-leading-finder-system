'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Compass,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  Users,
  Target,
  ArrowUpRight,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import LeadsTable from './LeadsTable'
import LeadDetailDrawer, { LeadItem } from './LeadDetailDrawer'

// Dynamic import for Leaflet map to prevent SSR window errors
const RadarMap = dynamic(() => import('./RadarMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400">
      <Loader2 size={24} className="animate-spin mb-2 text-blue-500" />
      <span className="text-xs font-medium">Memuat peta radar…</span>
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

export default function RadarWorkspace() {
  const [health, setHealth] = useState<HealthStatus>('checking')
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [radius, setRadius] = useState<number>(10)
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [enriching, setEnriching] = useState<boolean>(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.1930, 106.8237]) // Jakarta default
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Backend Health check
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
    const id = setInterval(checkHealth, 15_000)
    return () => clearInterval(id)
  }, [API_URL])

  // Load branches on mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await fetch(`${API_URL}/api/branches`)
        if (!res.ok) return
        const data = await res.json()
        setBranches(data.branches || [])
        if (data.branches?.length > 0) {
          const first = data.branches[0]
          setSelectedBranch(first)
          setMapCenter([first.latitude, first.longitude])
        }
      } catch (err) {
        console.error('Failed to load branches:', err)
      }
    }
    loadBranches()
  }, [API_URL])

  // Scan Radar (Discover leads)
  const handleScan = async () => {
    if (!selectedBranch && !mapCenter) return

    setLoading(true)
    try {
      const lat = selectedBranch ? selectedBranch.latitude : mapCenter[0]
      const lng = selectedBranch ? selectedBranch.longitude : mapCenter[1]

      const res = await fetch(`${API_URL}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          radius_km: radius,
        }),
      })

      if (!res.ok) {
        throw new Error(`Discover API returned status ${res.status}`)
      }

      const data = await res.json()
      setLeads(data.leads || [])
    } catch (err) {
      console.error('Radar scan failed:', err)
    } finally {
      setLoading(false)
    }
  }

  // Update lead status
  const handleStatusChange = async (leadId: number, status: string) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, lead_status: status } : l))
    )
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, lead_status: status } : null))
    }

    try {
      await fetch(`${API_URL}/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch (err) {
      console.error('Status update failed:', err)
    }
  }

  // Enrich single or batch leads
  const handleEnrich = async (leadIds: number[]) => {
    if (leadIds.length === 0) return
    setEnriching(true)

    try {
      const res = await fetch(`${API_URL}/api/leads/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
      })

      if (!res.ok) throw new Error('Enrichment failed')
      const data = await res.json()

      // Map results back into local leads state
      if (data.results && Array.isArray(data.results)) {
        setLeads((prev) =>
          prev.map((lead) => {
            const enriched = data.results.find((r: { lead_id: number }) => r.lead_id === lead.id)
            if (enriched) {
              const updated = {
                ...lead,
                enrichment: {
                  employee_or_student_count: enriched.signals?.employee_count || 100,
                  current_payment_methods: enriched.signals?.current_payment || 'QRIS / Cash',
                  pitch_script_wa: enriched.pitch_wa,
                  pitch_script_visit: enriched.pitch_visit,
                  raw_scraped_summary: enriched.signals?.news_signal || '',
                },
              }
              if (selectedLead?.id === lead.id) {
                setSelectedLead(updated)
              }
              return updated
            }
            return lead
          })
        )
      }
    } catch (err) {
      console.error('Enrichment API error:', err)
    } finally {
      setEnriching(false)
    }
  }

  // Export CSV
  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads/export`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mandiri-radar-${selectedBranch?.code || 'bftm'}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  // Handle lead selection for detail drawer
  const handleSelectLead = (lead: LeadItem) => {
    setSelectedLead(lead)
    setIsDrawerOpen(true)
  }

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = leads.length
    const highFit = leads.filter((l) => l.fit_score >= 80).length
    const won = leads.filter((l) => l.lead_status === 'Won').length
    const scheduled = leads.filter((l) => l.lead_status === 'Visit Scheduled').length
    return { total, highFit, won, scheduled }
  }, [leads])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F5F5F7] text-neutral-900">
      {/* ── Top Navigation Bar (Apple Frosted Glass) ── */}
      <header className="h-14 px-5 bg-white/80 backdrop-blur-xl border-b border-black/[0.08] flex items-center justify-between shrink-0 z-30">
        {/* Brand & Mandiri Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#002D62] to-[#0A3D78] flex items-center justify-center text-white shadow-xs">
            <Compass size={17} className="text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#002D62] tracking-tight leading-none">
                BFTM Radar
              </h1>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#002D62]/10 text-[#002D62]">
                Bank Mandiri
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Hyperlocal Lead Finder & Product-Matching Engine
            </p>
          </div>
        </div>

        {/* Status & Primary Actions */}
        <div className="flex items-center gap-3">
          {/* Backend Health Badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100/80 text-[11px] font-medium text-neutral-600">
            {health === 'checking' && (
              <>
                <span className="w-2 h-2 rounded-full bg-neutral-400" />
                <span>Memeriksa server…</span>
              </>
            )}
            {health === 'ok' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-semibold">Radar Aktif</span>
              </>
            )}
            {health === 'error' && (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600">Backend Offline (:8000)</span>
              </>
            )}
          </div>

          {/* Export CSV button */}
          {leads.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              aria-label="Unduh daftar prospek dalam format CSV"
              className="apple-pressable hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-black/[0.08] text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-xs"
            >
              <Download size={13} className="text-neutral-500" />
              <span>Ekspor CSV</span>
            </button>
          )}

          {/* Primary Scan Button */}
          <button
            type="button"
            onClick={handleScan}
            disabled={loading}
            className="apple-pressable inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#002D62] text-white text-xs font-semibold shadow-xs hover:bg-[#0A3D78] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin text-amber-300" />
                <span>Memindai Radar…</span>
              </>
            ) : (
              <>
                <Radio size={13} className="text-amber-300" />
                <span>Pindai Radar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Workspace Body ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* ── Left Sidebar / Control Deck ── */}
        <aside className="w-full md:w-80 lg:w-88 bg-white border-b md:border-b-0 md:border-r border-black/[0.08] flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-4 space-y-4">
            {/* Branch Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="branch-select"
                className="block text-xs font-semibold text-neutral-800 tracking-tight"
              >
                Pilih Kantor Cabang Mandiri
              </label>
              <div className="relative">
                <select
                  id="branch-select"
                  value={selectedBranch?.id || ''}
                  onChange={(e) => {
                    const branch = branches.find((b) => b.id === parseInt(e.target.value))
                    if (branch) {
                      setSelectedBranch(branch)
                      setMapCenter([branch.latitude, branch.longitude])
                    }
                  }}
                  className="w-full bg-neutral-50 border border-black/[0.08] rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer appearance-none pr-8"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
                <Building2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
              </div>
              {selectedBranch && (
                <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <MapPin size={11} className="text-neutral-400" />
                  <span>Kode: {selectedBranch.code} · Koordinat: {selectedBranch.latitude.toFixed(4)}, {selectedBranch.longitude.toFixed(4)}</span>
                </p>
              )}
            </div>

            {/* Radius Slider */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-black/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="radius-slider"
                  className="text-xs font-semibold text-neutral-800"
                >
                  Radius Pemindaian
                </label>
                <span className="text-xs font-bold text-neutral-900 tabular-nums px-2 py-0.5 rounded-md bg-white border border-black/[0.06] shadow-xs">
                  {radius}&nbsp;km
                </span>
              </div>

              <input
                id="radius-slider"
                type="range"
                min="1"
                max="25"
                step="1"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full"
              />

              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                <span>1 km</span>
                <span className="text-neutral-600 font-semibold">10 km (Default BFTM)</span>
                <span>25 km</span>
              </div>
            </div>

            {/* Radar Insights Cards */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-neutral-500 block">
                Ringkasan Radar Terkini
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-neutral-50 border border-black/[0.06]">
                  <span className="text-[11px] text-neutral-500 block mb-1">
                    Total Prospek
                  </span>
                  <span className="text-xl font-bold text-neutral-900 tabular-nums">
                    {stats.total}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                  <span className="text-[11px] text-blue-700 font-medium block mb-1">
                    Skor Tinggi (&gt;80%)
                  </span>
                  <span className="text-xl font-bold text-blue-900 tabular-nums">
                    {stats.highFit}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                  <span className="text-[11px] text-purple-700 font-medium block mb-1">
                    Jadwal Kunjungan
                  </span>
                  <span className="text-xl font-bold text-purple-900 tabular-nums">
                    {stats.scheduled}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 font-medium block mb-1">
                    Closing / Won
                  </span>
                  <span className="text-xl font-bold text-emerald-900 tabular-nums">
                    {stats.won}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruction Card */}
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/50 text-[11px] text-amber-900 leading-relaxed">
              <strong>Tips BFTM:</strong> Klik pin POI pada peta atau baris tabel untuk membuka{' '}
              <em>Naskah Pitching WhatsApp</em> yang dirancang khusus sesuai profil entitas.
            </div>
          </div>
        </aside>

        {/* ── Main Canvas (Split: Map & Table) ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-neutral-100">
          {/* Top Half: Interactive Map */}
          <div className="h-64 sm:h-80 md:h-[48%] relative shrink-0 border-b border-black/[0.08]">
            <RadarMap
              center={mapCenter}
              radiusKm={radius}
              leads={leads}
              selectedLeadId={selectedLead?.id}
              onLocationChange={(coords) => setMapCenter(coords)}
              onSelectLead={handleSelectLead}
            />
          </div>

          {/* Bottom Half: Interactive Lead Table */}
          <div className="flex-1 overflow-hidden bg-white">
            <LeadsTable
              leads={leads}
              selectedLeadId={selectedLead?.id}
              onSelectLead={handleSelectLead}
              onStatusChange={handleStatusChange}
              onEnrich={handleEnrich}
              onExport={handleExport}
              isEnriching={enriching}
            />
          </div>
        </main>
      </div>

      {/* ── Slide-over Detail & Pitch Script Drawer ── */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        onEnrichLead={async (id) => {
          await handleEnrich([id])
        }}
        isEnriching={enriching}
      />
    </div>
  )
}
