'use client'

import React, { useEffect, useState } from 'react'
import {
  X,
  Sparkles,
  Phone,
  Globe,
  MapPin,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Users,
  CreditCard,
  Loader2,
} from 'lucide-react'

export interface LeadEnrichmentData {
  employee_or_student_count?: number
  current_payment_methods?: string
  pitch_script_wa?: string
  pitch_script_visit?: string
  raw_scraped_summary?: string
}

export interface LeadItem {
  id: number
  place_id: string
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
  enrichment?: LeadEnrichmentData | null
}

interface LeadDetailDrawerProps {
  lead: LeadItem | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (leadId: number, status: string) => void
  onEnrichLead: (leadId: number) => Promise<void>
  isEnriching?: boolean
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  New: {
    label: 'Prospek Baru',
    bg: 'bg-blue-50/80',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  Contacted: {
    label: 'Sudah Dihubungi',
    bg: 'bg-amber-50/80',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  'Visit Scheduled': {
    label: 'Jadwal Kunjungan',
    bg: 'bg-purple-50/80',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  Won: {
    label: 'Closing / Nasabah',
    bg: 'bg-emerald-50/80',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  Dropped: {
    label: 'Batal / Tidak Sesuai',
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    dot: 'bg-neutral-400',
  },
}

export default function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  onStatusChange,
  onEnrichLead,
  isEnriching = false,
}: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'wa' | 'visit'>('wa')
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!lead) return null

  const isEnriched = Boolean(
    lead.enrichment?.pitch_script_wa ||
      lead.enrichment?.employee_or_student_count ||
      lead.enrichment?.current_payment_methods
  )

  const defaultWaPitch =
    lead.enrichment?.pitch_script_wa ||
    `Selamat pagi/siang Bapak/Ibu pimpinan ${lead.name},\n\nPerkenalkan saya dari Tim Branch Funding Transaction Bank Mandiri. Kami mengamati potensi perkembangan bisnis ${lead.name} di kawasan ${lead.address.split(',')[0] || 'ini'}.\n\nKami ingin berbagi solusi perbankan khusus melalui ${lead.recommended_product || 'layanan transaksi Mandiri'} yang dapat mengoptimalkan pengelolaan likuiditas serta mempermudah transaksi harian.\n\nApakah kami dapat meminta waktu 5-10 menit untuk berbincang secara singkat via WhatsApp atau menjadwalkan kunjungan silaturahmi?\n\nTerima kasih.`

  const defaultVisitPitch =
    lead.enrichment?.pitch_script_visit ||
    `Panduan Kunjungan Lapangan BFTM:\n1. Pembuka: Sampaikan apresiasi atas perkembangan ${lead.name}.\n2. Problem Statement: Diskusikan efisiensi transaksi, kemudahan rekonsiliasi, dan pengelolaan kas harian.\n3. Solusi Mandiri: Kenalkan ${lead.recommended_product} dengan benefit bebas biaya transaksi / integrasi QRIS & EDC Mandiri.\n4. Call to Action: Buka rekening operasional atau aktivasi Livin' Merchant di tempat.`

  const currentScript = activeTab === 'wa' ? defaultWaPitch : defaultVisitPitch

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentScript)
      setCopyState('success')
    } catch {
      setCopyState('error')
    }
    window.setTimeout(() => setCopyState('idle'), 2000)
  }

  // Clean phone number for WhatsApp link (e.g. +62 812-xxx -> 62812xxx)
  const cleanPhone = lead.phone_number?.replace(/\D/g, '') || ''
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultWaPitch)}`
    : null

  const statusInfo = STATUS_CONFIG[lead.lead_status] || STATUS_CONFIG.New

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[1100] bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          transitionTimingFunction: 'var(--ease-out)',
        }}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`fixed top-0 right-0 z-[1200] h-full w-full max-w-lg bg-white/95 backdrop-blur-2xl border-l border-black/[0.08] shadow-2xl flex flex-col justify-between overflow-hidden transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          transitionTimingFunction: 'var(--ease-drawer)',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-black/[0.06] flex items-start justify-between gap-4 bg-white/70">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                {lead.category}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
            </div>
            <h2
              id="drawer-title"
              className="text-lg font-semibold text-neutral-900 tracking-tight leading-snug truncate"
            >
              {lead.name}
            </h2>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1 truncate">
              <MapPin size={12} className="shrink-0 text-neutral-400" />
              <span className="truncate">{lead.address}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail prospek"
            className="apple-pressable p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Fit Score & Product Banner */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#002D62] to-[#0A3D78] text-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium tracking-wide text-white/70">
                Rekomendasi Produk Bank Mandiri
              </span>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tabular-nums text-amber-300">
                <Sparkles size={12} />
                <span>Kesesuaian {lead.fit_score}%</span>
              </div>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {lead.recommended_product}
            </h3>
            <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
              {lead.pitch_angle || 'Optimalisasi transaksi kas dan payroll instansi'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="rounded-2xl border border-black/[0.06] bg-neutral-50/70 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-neutral-800 tracking-tight">
              Kontak & Saluran Publik
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {lead.phone_number ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-black/[0.04]">
                  <span className="flex items-center gap-2 text-neutral-600">
                    <Phone size={13} className="text-neutral-400" />
                    <span className="tabular-nums font-medium text-neutral-800">
                      {lead.phone_number}
                    </span>
                  </span>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-pressable inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-[11px]"
                    >
                      <MessageCircle size={12} /> Chat WA
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-white border border-black/[0.04] text-neutral-400 italic">
                  Nomor telepon belum tercantum di direktori
                </div>
              )}

              {lead.website ? (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pressable flex items-center justify-between p-2 rounded-xl bg-white border border-black/[0.04] text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Globe size={13} className="text-blue-500 shrink-0" />
                    <span className="truncate">{lead.website}</span>
                  </span>
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              ) : (
                <div className="p-2 rounded-xl bg-white border border-black/[0.04] text-neutral-400 italic">
                  Situs web resmi tidak tersedia (menggunakan pencarian berita lokal)
                </div>
              )}
            </div>
          </div>

          {/* ScrapeGraphAI Enriched Signals */}
          <div className="rounded-2xl border border-black/[0.06] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900 tracking-tight">
                    Sinyal Lapangan (ScrapeGraphAI)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Ekstraksi profil publik & berita lokal
                  </p>
                </div>
              </div>

              {!isEnriched && (
                <button
                  type="button"
                  onClick={() => onEnrichLead(lead.id)}
                  disabled={isEnriching}
                  className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {isEnriching ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Menganalisis…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      <span>AI Deep-Dive</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isEnriched ? (
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-black/[0.04]">
                  <span className="text-[11px] text-neutral-500 block mb-0.5">
                    Estimasi Siswa / Karyawan
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 tabular-nums flex items-center gap-1.5">
                    <Users size={14} className="text-neutral-400" />
                    {lead.enrichment?.employee_or_student_count || '±50-100'} orang
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 border border-black/[0.04]">
                  <span className="text-[11px] text-neutral-500 block mb-0.5">
                    Kanal Pembayaran Saat Ini
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 truncate flex items-center gap-1.5">
                    <CreditCard size={14} className="text-neutral-400 shrink-0" />
                    <span className="truncate">
                      {lead.enrichment?.current_payment_methods || 'Tunai / QRIS'}
                    </span>
                  </span>
                </div>

                {lead.enrichment?.raw_scraped_summary && (
                  <div className="col-span-2 p-2.5 rounded-xl bg-neutral-50 border border-black/[0.04] text-[11px] text-neutral-600 leading-relaxed">
                    <span className="font-medium text-neutral-800 block mb-1">
                      Catatan Intelijen AI:
                    </span>
                    {lead.enrichment.raw_scraped_summary}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-200 p-3 text-center">
                <p className="text-xs text-neutral-500">
                  Data sinyal belum diperkaya. Klik tombol <strong>AI Deep-Dive</strong> untuk
                  mengekstrak profil dan estimasi transaksi.
                </p>
              </div>
            )}
          </div>

          {/* AI Pitch Script Generator */}
          <div className="rounded-2xl border border-black/[0.06] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-900 tracking-tight">
                Naskah Komunikasi Siap Pakai
              </h4>
              {/* Segmented Control */}
              <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('wa')}
                  className={`apple-pressable px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'wa'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('visit')}
                  className={`apple-pressable px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'visit'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Kunjungan
                </button>
              </div>
            </div>

            {/* Script Text Box */}
            <div className="relative rounded-xl bg-neutral-50 border border-black/[0.06] p-3.5 text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap font-sans">
              {currentScript}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="apple-pressable flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                {copyState === 'success' ? <><Check size={14} className="text-emerald-400" /><span>Tersalin</span></> : <><Copy size={14} /><span>Salin Naskah</span></>}
              </button>
              <span className="sr-only" aria-live="polite">{copyState === 'success' ? 'Naskah tersalin ke clipboard.' : copyState === 'error' ? 'Naskah tidak dapat disalin. Salin teks secara manual.' : ''}</span>

              {activeTab === 'wa' && waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pressable inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#22c35e] text-white text-xs font-medium"
                >
                  <MessageCircle size={14} />
                  <span>Kirim WA</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer: Status Selector */}
        <div className="p-4 border-t border-black/[0.06] bg-neutral-50/80 flex items-center justify-between gap-3">
          <div className="flex-1">
            <label
              htmlFor="lead-status-select"
              className="block text-[11px] font-medium text-neutral-500 mb-1"
            >
              Ubah Status Prospek
            </label>
            <select
              id="lead-status-select"
              value={lead.lead_status}
              onChange={(e) => onStatusChange(lead.id, e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              <option value="New">Prospek Baru (New)</option>
              <option value="Contacted">Sudah Dihubungi (Contacted)</option>
              <option value="Visit Scheduled">Jadwal Kunjungan (Visit Scheduled)</option>
              <option value="Won">Closing / Jadi Nasabah (Won)</option>
              <option value="Dropped">Batal / Tidak Sesuai (Dropped)</option>
            </select>
          </div>
        </div>
      </aside>
    </>
  )
}
