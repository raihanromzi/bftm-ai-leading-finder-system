'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Globe, Loader2, MapPin, MessageCircle, Phone, Sparkles, Users, CreditCard, X } from 'lucide-react'

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

interface Props {
  lead: LeadItem | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (leadId: number, status: string) => void
  onEnrichLead: (leadId: number) => Promise<void>
  isEnriching?: boolean
}

const statusLabel: Record<string, string> = { New: 'Prospek baru', Contacted: 'Sudah dihubungi', 'Visit Scheduled': 'Jadwal kunjungan', Won: 'Closing / nasabah', Dropped: 'Batal / tidak sesuai' }

export default function LeadDetailDrawer({ lead, isOpen, onClose, onStatusChange, onEnrichLead, isEnriching = false }: Props) {
  const [activeTab, setActiveTab] = useState<'wa' | 'visit'>('wa')
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && isOpen && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen, onClose])

  if (!lead) return null

  const isEnriched = Boolean(lead.enrichment?.pitch_script_wa || lead.enrichment?.employee_or_student_count || lead.enrichment?.current_payment_methods)
  const waPitch = lead.enrichment?.pitch_script_wa || `Selamat pagi/siang Bapak/Ibu pimpinan ${lead.name},\n\nPerkenalkan saya dari Tim Branch Funding Transaction Bank Mandiri. Kami mengamati potensi perkembangan bisnis ${lead.name} di kawasan ${lead.address.split(',')[0] || 'ini'}.\n\nKami ingin berbagi solusi perbankan khusus melalui ${lead.recommended_product || 'layanan transaksi Mandiri'} yang dapat mengoptimalkan pengelolaan likuiditas serta mempermudah transaksi harian.\n\nApakah kami dapat meminta waktu 5-10 menit untuk berbincang secara singkat via WhatsApp atau menjadwalkan kunjungan silaturahmi?\n\nTerima kasih.`
  const visitPitch = lead.enrichment?.pitch_script_visit || `Panduan Kunjungan Lapangan BFTM:\n1. Pembuka: Sampaikan apresiasi atas perkembangan ${lead.name}.\n2. Problem Statement: Diskusikan efisiensi transaksi, kemudahan rekonsiliasi, dan pengelolaan kas harian.\n3. Solusi Mandiri: Kenalkan ${lead.recommended_product} dengan benefit bebas biaya transaksi / integrasi QRIS & EDC Mandiri.\n4. Call to Action: Buka rekening operasional atau aktivasi Livin' Merchant di tempat.`
  const script = activeTab === 'wa' ? waPitch : visitPitch
  const phone = lead.phone_number?.replace(/\D/g, '') || ''
  const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waPitch)}` : null

  const copy = async () => {
    try { await navigator.clipboard.writeText(script); setCopyState('success') } catch { setCopyState('error') }
    window.setTimeout(() => setCopyState('idle'), 2000)
  }

  return <>
    <div className={`lead-drawer-backdrop fixed inset-0 z-[1100] ${isOpen ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
    <aside role="dialog" aria-modal="true" aria-labelledby="drawer-title" className={`lead-drawer fixed right-4 top-4 z-[1200] flex h-[calc(100dvh-32px)] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden ${isOpen ? 'is-open' : ''}`}>
      <header className="lead-drawer-header">
        <div className="min-w-0">
          <div className="lead-drawer-badges"><span>{lead.category}</span><span className="lead-status-badge">{statusLabel[lead.lead_status] || statusLabel.New}</span></div>
          <h2 id="drawer-title">{lead.name}</h2>
          <p><MapPin size={14} />{lead.address}</p>
        </div>
        <button type="button" className="lead-icon-button" onClick={onClose} aria-label="Tutup detail prospek"><X size={18} /></button>
      </header>

      <div className="lead-drawer-content">
        <section className="lead-product-card">
          <div><span>Rekomendasi produk Mandiri</span><strong>{lead.fit_score}% Fit</strong></div>
          <h3>{lead.recommended_product}</h3>
          <p>{lead.pitch_angle || 'Optimalisasi transaksi kas dan payroll instansi.'}</p>
        </section>

        <section className="lead-card">
          <h3>Kontak & saluran publik</h3>
          {lead.phone_number ? <div className="lead-contact-row"><span><Phone size={14} />{lead.phone_number}</span>{waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer">WhatsApp <MessageCircle size={14} /></a>}</div> : <p className="lead-empty-copy">Nomor telepon belum tercantum di direktori.</p>}
          {lead.website ? <a className="lead-website" href={lead.website} target="_blank" rel="noopener noreferrer"><span><Globe size={14} />{lead.website}</span><ExternalLink size={14} /></a> : <p className="lead-empty-copy">Situs web resmi tidak tersedia. Menggunakan pencarian berita lokal.</p>}
        </section>

        <section className="lead-card">
          <div className="lead-card-heading"><div><span className="lead-signal-icon"><Sparkles size={16} /></span><div><h3>Sinyal lapangan</h3><p>Ekstraksi profil publik & berita lokal</p></div></div>{!isEnriched && <button type="button" className="lead-deep-dive" onClick={() => onEnrichLead(lead.id)} disabled={isEnriching}>{isEnriching ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}{isEnriching ? 'Menganalisis…' : 'AI Deep-Dive'}</button>}</div>
          {isEnriched ? <div className="lead-signal-grid"><div><span>Estimasi skala</span><strong><Users size={15} />{lead.enrichment?.employee_or_student_count || '±50–100'} orang</strong></div><div><span>Kanal saat ini</span><strong><CreditCard size={15} />{lead.enrichment?.current_payment_methods || 'Tunai / QRIS'}</strong></div>{lead.enrichment?.raw_scraped_summary && <p>{lead.enrichment.raw_scraped_summary}</p>}</div> : <p className="lead-empty-signal">Data sinyal belum diperkaya. Jalankan AI Deep-Dive untuk mengekstrak profil dan estimasi transaksi.</p>}
        </section>

        <section className="lead-card">
          <div className="lead-script-heading"><h3>Naskah komunikasi siap pakai</h3><div role="tablist" aria-label="Pilihan naskah"><button type="button" role="tab" aria-selected={activeTab === 'wa'} onClick={() => setActiveTab('wa')}>WhatsApp</button><button type="button" role="tab" aria-selected={activeTab === 'visit'} onClick={() => setActiveTab('visit')}>Kunjungan</button></div></div>
          <div className="lead-script">{script}</div>
          <div className="lead-script-actions"><button type="button" className="lead-primary-action" onClick={copy}>{copyState === 'success' ? <><Check size={16} />Tersalin</> : <><Copy size={16} />Salin naskah</>}</button>{activeTab === 'wa' && waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer" className="lead-wa-action"><MessageCircle size={16} />Kirim WA</a>}</div>
          <span className="sr-only" aria-live="polite">{copyState === 'success' ? 'Naskah tersalin ke clipboard.' : copyState === 'error' ? 'Naskah tidak dapat disalin. Salin teks secara manual.' : ''}</span>
        </section>
      </div>

      <footer className="lead-drawer-footer"><label htmlFor="lead-status-select">Ubah status prospek</label><select id="lead-status-select" value={lead.lead_status} onChange={(event) => onStatusChange(lead.id, event.target.value)}><option value="New">Prospek baru (New)</option><option value="Contacted">Sudah dihubungi (Contacted)</option><option value="Visit Scheduled">Jadwal kunjungan (Visit Scheduled)</option><option value="Won">Closing / jadi nasabah (Won)</option><option value="Dropped">Batal / tidak sesuai (Dropped)</option></select></footer>
    </aside>
  </>
}
