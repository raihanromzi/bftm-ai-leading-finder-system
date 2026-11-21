'use client'

import React, { useMemo, useState } from 'react'
import {
  Download,
  Search,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Coffee,
  ShoppingBag,
  Factory,
  Building2,
  Loader2,
  X,
} from 'lucide-react'
import { LeadItem } from './LeadDetailDrawer'

interface LeadsTableProps {
  leads: LeadItem[]
  selectedLeadId?: number | null
  onSelectLead: (lead: LeadItem) => void
  onStatusChange?: (leadId: number, status: string) => void
  onEnrich?: (leadIds: number[]) => Promise<void>
  onExport?: () => void
  isEnriching?: boolean
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'education', label: 'Sekolah & Kampus' },
  { id: 'fnb', label: 'Kafe & Resto' },
  { id: 'retail', label: 'Minimarket & Ritel' },
  { id: 'industry', label: 'Pabrik & Industri' },
]

const STATUS_OPTIONS = [
  { value: 'New', label: 'Prospek Baru' },
  { value: 'Contacted', label: 'Dihubungi' },
  { value: 'Visit Scheduled', label: 'Jadwal Kunjungan' },
  { value: 'Won', label: 'Closing' },
  { value: 'Dropped', label: 'Batal' },
]

function getCategoryIcon(category: string) {
  const cat = category.toLowerCase()
  if (cat.includes('school') || cat.includes('sekolah') || cat.includes('univ')) {
    return <GraduationCap size={14} className="text-blue-600" />
  }
  if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('rest')) {
    return <Coffee size={14} className="text-amber-600" />
  }
  if (cat.includes('convenience') || cat.includes('store') || cat.includes('market') || cat.includes('ritel')) {
    return <ShoppingBag size={14} className="text-emerald-600" />
  }
  if (cat.includes('factory') || cat.includes('pabrik') || cat.includes('industri')) {
    return <Factory size={14} className="text-slate-600" />
  }
  return <Building2 size={14} className="text-neutral-500" />
}

function getProductBadgeStyle(product: string) {
  const p = product.toLowerCase()
  if (p.includes('simpel') || p.includes('payroll')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/60'
  }
  if (p.includes('merchant') || p.includes('edc')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/60'
  }
  if (p.includes('militan') || p.includes('campus') || p.includes('gmm')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/60'
  }
  return 'bg-neutral-100 text-neutral-700 border-neutral-200'
}

export default function LeadsTable({
  leads,
  selectedLeadId,
  onSelectLead,
  onStatusChange,
  onEnrich,
  onExport,
  isEnriching = false,
}: LeadsTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter leads based on category and search query
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Category filter
      if (activeCategory === 'education') {
        const c = lead.category.toLowerCase()
        if (!c.includes('school') && !c.includes('sekolah') && !c.includes('univ')) return false
      } else if (activeCategory === 'fnb') {
        const c = lead.category.toLowerCase()
        if (!c.includes('cafe') && !c.includes('coffee') && !c.includes('rest')) return false
      } else if (activeCategory === 'retail') {
        const c = lead.category.toLowerCase()
        if (!c.includes('convenience') && !c.includes('store') && !c.includes('market') && !c.includes('ritel')) return false
      } else if (activeCategory === 'industry') {
        const c = lead.category.toLowerCase()
        if (!c.includes('factory') && !c.includes('pabrik') && !c.includes('industri')) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = lead.name.toLowerCase().includes(q)
        const matchAddr = lead.address.toLowerCase().includes(q)
        const matchProduct = lead.recommended_product.toLowerCase().includes(q)
        if (!matchName && !matchAddr && !matchProduct) return false
      }

      return true
    })
  }, [leads, activeCategory, searchQuery])

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredLeads.map((l) => l.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBatchEnrich = async () => {
    if (selectedIds.length === 0 || !onEnrich) return
    await onEnrich(selectedIds)
    setSelectedIds([])
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
          <Building2 size={24} />
        </div>
        <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
          Belum Ada Prospek Terdeteksi
        </h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-relaxed">
          Pilih lokasi cabang Bank Mandiri dan atur radius pemindaian, lalu klik tombol{' '}
          <strong>Pindai Radar</strong> untuk mendeteksi prospek potensial di sekitar Anda.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden select-none">
      {/* Search & Category Pills Filter Bar */}
      <div className="p-3.5 border-b border-black/[0.06] bg-neutral-50/50 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama prospek, alamat, atau produk…"
              aria-label="Cari prospek"
              className="w-full pl-8.5 pr-8 py-1.5 rounded-xl bg-white border border-black/[0.08] text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none transition-shadow"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Export CSV CTA */}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              aria-label="Ekspor data prospek ke format CSV"
              className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-black/[0.08] text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-xs shrink-0"
            >
              <Download size={13} className="text-neutral-500" />
              <span>Ekspor CSV</span>
            </button>
          )}
        </div>

        {/* Category Pills & Selection Indicator */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`apple-pressable px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-black/[0.06] text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-neutral-500 shrink-0 tabular-nums">
            Menampilkan {filteredLeads.length} dari {leads.length} prospek
          </div>
        </div>
      </div>

      {/* Batch Action Bar (Triggered when items selected) */}
      {selectedIds.length > 0 && (
        <div className="px-4 py-2 bg-blue-50/90 border-b border-blue-100 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <span className="font-medium text-blue-900">
            <strong className="tabular-nums">{selectedIds.length}</strong> prospek dipilih
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchEnrich}
              disabled={isEnriching}
              className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#002D62] text-white text-xs font-medium hover:bg-[#0A3D78] disabled:opacity-50"
            >
              {isEnriching ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Menganalisis {selectedIds.length} Prospek…</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="text-amber-300" />
                  <span>AI Deep-Dive ({selectedIds.length})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-neutral-500 hover:text-neutral-700 px-2 py-1 text-xs"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur-md border-b border-black/[0.06]">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center">
                <input
                  type="checkbox"
                  aria-label="Pilih semua prospek yang ditampilkan"
                  checked={
                    selectedIds.length === filteredLeads.length && filteredLeads.length > 0
                  }
                  onChange={handleSelectAll}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 font-semibold text-neutral-700">Nama & Alamat</th>
              <th className="px-3 py-2.5 font-semibold text-neutral-700">Kategori</th>
              <th className="px-3 py-2.5 font-semibold text-neutral-700">Produk Mandiri</th>
              <th className="px-3 py-2.5 font-semibold text-neutral-700 text-center">Kesesuaian</th>
              <th className="px-3 py-2.5 font-semibold text-neutral-700">Status</th>
              <th className="w-20 px-3 py-2.5 text-right font-semibold text-neutral-700">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/[0.04]">
            {filteredLeads.map((lead) => {
              const isSelected = selectedIds.includes(lead.id)
              const isActive = selectedLeadId === lead.id
              const isEnriched = Boolean(lead.enrichment?.pitch_script_wa)

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-50/70'
                      : isSelected
                      ? 'bg-neutral-50'
                      : 'hover:bg-neutral-50/70'
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="w-10 px-3 py-3 text-center"
                    onClick={(e) => toggleSelect(lead.id, e)}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${lead.name}`}
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Name & Address */}
                  <td className="px-3 py-3 min-w-[180px] max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                        {lead.name}
                      </span>
                      {isEnriched && (
                        <span
                          title="Sinyal sudah diperkaya ScrapeGraphAI"
                          className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {lead.address}
                    </p>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-neutral-600">
                      {getCategoryIcon(lead.category)}
                      <span className="capitalize">{lead.category.replace('_', ' ')}</span>
                    </span>
                  </td>

                  {/* Recommended Product */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getProductBadgeStyle(
                        lead.recommended_product
                      )}`}
                    >
                      {lead.recommended_product.split('&')[0].trim()}
                    </span>
                  </td>

                  {/* Fit Score */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 font-bold tabular-nums text-xs ${
                        lead.fit_score >= 85
                          ? 'text-emerald-600'
                          : lead.fit_score >= 70
                          ? 'text-amber-600'
                          : 'text-neutral-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          lead.fit_score >= 85
                            ? 'bg-emerald-500'
                            : lead.fit_score >= 70
                            ? 'bg-amber-500'
                            : 'bg-neutral-400'
                        }`}
                      />
                      {lead.fit_score}%
                    </span>
                  </td>

                  {/* Status Dropdown */}
                  <td
                    className="px-3 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={lead.lead_status}
                      aria-label={`Status prospek untuk ${lead.name}`}
                      onChange={(e) => onStatusChange?.(lead.id, e.target.value)}
                      className="bg-neutral-100 hover:bg-neutral-200 border-none rounded-lg px-2.5 py-1 text-[11px] font-medium text-neutral-800 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Action Link */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      aria-label={`Buka detail dan naskah untuk ${lead.name}`}
                      className="apple-pressable inline-flex items-center gap-0.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Naskah</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
