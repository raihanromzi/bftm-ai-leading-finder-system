'use client'

import { useEffect } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { LeadItem } from './LeadDetailDrawer'

type Coordinates = [number, number]

interface RadarMapProps {
  center: Coordinates
  radiusKm: number
  leads: LeadItem[]
  selectedLeadId?: number | null
  onLocationChange: (coordinates: Coordinates) => void
  onSelectLead: (lead: LeadItem) => void
}

function FixLeafletIcons() {
  const map = useMap()

  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
    map.attributionControl.setPrefix('')
  }, [map])

  return null
}

function RecenterMap({ center }: { center: Coordinates }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

function MapClickHandler({ onLocationChange }: Pick<RadarMapProps, 'onLocationChange'>) {
  useMapEvents({
    click: ({ latlng }) => onLocationChange([latlng.lat, latlng.lng]),
  })
  return null
}

// Helper to generate Apple-style SVG DivIcons for Leaflet
function createCategoryIcon(category: string, fitScore: number, isActive: boolean) {
  let bgColor = '#002D62' // default Mandiri navy
  let svgPath = ''

  const cat = category.toLowerCase()
  if (cat.includes('school') || cat.includes('sekolah') || cat.includes('university') || cat.includes('kampus')) {
    bgColor = '#0071E3' // Apple blue
    // Graduation Cap SVG
    svgPath = '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>'
  } else if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('restaurant') || cat.includes('kopi')) {
    bgColor = '#D97706' // Warm Amber
    // Coffee Cup SVG
    svgPath = '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>'
  } else if (cat.includes('convenience') || cat.includes('store') || cat.includes('market') || cat.includes('ritel')) {
    bgColor = '#059669' // Emerald
    // Shopping Bag SVG
    svgPath = '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'
  } else if (cat.includes('factory') || cat.includes('pabrik') || cat.includes('industri')) {
    bgColor = '#475569' // Slate
    // Factory SVG
    svgPath = '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>'
  } else {
    bgColor = '#002D62' // Mandiri Navy
    // Building SVG
    svgPath = '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/>'
  }

  const activeRing = isActive ? 'active' : ''

  const html = `
    <div class="pin-bubble ${activeRing}" style="background-color: ${bgColor};">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        ${svgPath}
      </svg>
      <span style="position: absolute; top: -6px; right: -6px; background: #FFFFFF; color: #1D1D1F; font-size: 9px; font-weight: 700; border-radius: 9999px; padding: 1px 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); font-family: -apple-system, sans-serif; font-variant-numeric: tabular-nums;">
        ${fitScore}%
      </span>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-radar-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  })
}

// Center branch anchor pin
const centerBranchIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(0, 113, 227, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 30px; height: 30px; border-radius: 50%; background: #002D62; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,45,98,0.4); display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB300" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
      </div>
    </div>
  `,
  className: 'custom-radar-pin',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -22],
})

export default function RadarMap({
  center,
  radiusKm,
  leads,
  selectedLeadId,
  onLocationChange,
  onSelectLead,
}: RadarMapProps) {
  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <FixLeafletIcons />
        <RecenterMap center={center} />
        <MapClickHandler onLocationChange={onLocationChange} />

        {/* Center Branch Anchor */}
        <Marker position={center} icon={centerBranchIcon}>
          <Popup>
            <div className="p-1">
              <p className="text-xs font-semibold text-neutral-900">Titik Radar Cabang</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Pusat pemindaian radius {radiusKm}&nbsp;km
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Radar Coverage Circle */}
        <Circle
          center={center}
          radius={radiusKm * 1_000}
          pathOptions={{
            color: '#0071E3',
            weight: 1.5,
            fillColor: '#0071E3',
            fillOpacity: 0.08,
            dashArray: '4, 6',
          }}
        />

        {/* Discovered Leads POI */}
        {leads.map((lead) => {
          const isActive = selectedLeadId === lead.id
          const icon = createCategoryIcon(lead.category, lead.fit_score, isActive)

          return (
            <Marker
              key={lead.id}
              position={[lead.latitude, lead.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectLead(lead),
              }}
            >
              <Popup>
                <div className="p-2 space-y-2 min-w-[210px] max-w-[260px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                      {lead.category}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 tabular-nums">
                      {lead.fit_score}% Fit
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 leading-tight">
                      {lead.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      {lead.address}
                    </p>
                  </div>

                  <div className="rounded-lg bg-blue-50/70 p-2 border border-blue-100">
                    <p className="text-[10px] font-medium text-blue-900">
                      {lead.recommended_product}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectLead(lead)
                    }}
                    className="apple-pressable w-full py-1.5 px-3 rounded-lg bg-neutral-900 text-white text-xs font-medium text-center hover:bg-neutral-800"
                  >
                    Buka Detail & Naskah
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Floating map hint */}
      <div className="absolute top-4 right-4 z-[400] pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-sm text-[11px] font-medium text-neutral-600 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span>Klik peta untuk pindah koordinat</span>
        </div>
      </div>
    </div>
  )
}
