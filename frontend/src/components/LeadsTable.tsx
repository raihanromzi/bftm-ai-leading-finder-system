'use client'

import { useState } from 'react'
import { Copy, Download, ChevronDown } from 'lucide-react'

interface Lead {
  id: number
  name: string
  category: string
  address: string
  phone_number: string
  website: string
  recommended_product: string
  fit_score: number
  lead_status: string
  pitch_angle: string
}

interface LeadsTableProps {
  leads: Lead[]
  onStatusChange?: (leadId: number, status: string) => void
  onEnrich?: (leadIds: number[]) => void
  onExport?: () => void
}

const STATUS_OPTIONS = ['New', 'Contacted', 'Visit Scheduled', 'Won', 'Dropped']
const STATUS_COLORS: Record<string, string> = {
  New: 'bg-gray-100 text-gray-700',
  Contacted: 'bg-blue-100 text-blue-700',
  'Visit Scheduled': 'bg-yellow-100 text-yellow-700',
  Won: 'bg-green-100 text-green-700',
  Dropped: 'bg-red-100 text-red-700',
}

export default function LeadsTable({
  leads,
  onStatusChange,
  onEnrich,
  onExport,
}: LeadsTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleStatusChange = (leadId: number, status: string) => {
    onStatusChange?.(leadId, status)
  }

  const handleEnrich = () => {
    if (selectedIds.length === 0) return
    onEnrich?.(selectedIds)
    setSelectedIds([])
  }

  const scoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-gray-500'
  }

  if (leads.length === 0) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280' }}>
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Tidak ada leads ditemukan</p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>
          Pilih lokasi cabang dan klik "Scan" untuk menemukan entitas terdekat.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {selectedIds.length} selected
        </span>
        {selectedIds.length > 0 && (
          <button
            onClick={handleEnrich}
            style={{
              background: 'var(--navy)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            className="btn"
          >
            Deep-Dive Enrich ({selectedIds.length})
          </button>
        )}
        {leads.length > 0 && (
          <button
            onClick={onExport}
            style={{
              background: '#fff',
              color: 'var(--navy)',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            className="btn"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 10 }}>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === leads.length && leads.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(leads.map((l) => l.id))
                    } else {
                      setSelectedIds([])
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Nama</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Kategori</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Produk</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Skor</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>•</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                style={{
                  borderBottom: '1px solid #E5E7EB',
                  background: selectedIds.includes(lead.id) ? '#F3F4F6' : '#fff',
                  transition: 'background-color 160ms var(--ease-out)',
                }}
              >
                <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500 }}>
                  {lead.name}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: '#6B7280',
                  }}
                >
                  {lead.category}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                  <span
                    style={{
                      background: 'var(--navy)',
                      color: 'var(--gold)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-block',
                    }}
                  >
                    {lead.recommended_product.split('&')[0].trim()}
                  </span>
                </td>
                <td
                  style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}
                  className={scoreColor(lead.fit_score)}
                >
                  {lead.fit_score}%
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                  <select
                    value={lead.lead_status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    style={{
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      background: '#fff',
                    }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  <button
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: expandedId === lead.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms var(--ease-out)',
                    }}
                  >
                    <ChevronDown size={16} color="#6B7280" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
