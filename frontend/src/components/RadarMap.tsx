'use client'

import { useEffect } from 'react'
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
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
  onHoverLead: (lead: LeadItem | null) => void
  onSelectLead: (lead: LeadItem) => void
}

const JABODETABEK_MAX_BOUNDS: L.LatLngBoundsExpression = [[-7.06, 106.09], [-5.72, 107.58]]

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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.setView(center, map.getZoom(), { animate: !reducedMotion })
  }, [center, map])
  return null
}

function MapClickHandler({ onLocationChange }: Pick<RadarMapProps, 'onLocationChange'>) {
  useMapEvents({ click: ({ latlng }) => onLocationChange([latlng.lat, latlng.lng]) })
  return null
}

function markerIcon(category: string, fitScore: number, isActive: boolean) {
  const value = category.toLowerCase()
  const type = /school|sekolah|univ|kampus/.test(value) ? 'education' : /factory|pabrik|industri/.test(value) ? 'industry' : /cafe|coffee|restaurant|kopi|store|market|ritel/.test(value) ? 'retail' : 'general'
  const paths = {
    education: '<path d="M3 10 12 5l9 5-9 5-9-5Z"/><path d="M7 13v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4"/><path d="M21 10v6"/>',
    industry: '<path d="M3 21V9l6 4V9l6 4V5l6 4v12H3Z"/><path d="M7 21v-4h3v4m3 0v-4h3v4"/>',
    retail: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
    general: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M10 21v-4h4v4"/>',
  }
  const color = { education: '#2563eb', industry: '#d97706', retail: '#0d9488', general: '#334155' }[type]
  return L.divIcon({
    className: 'custom-radar-pin',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    html: `<div class="radar-pin ${isActive ? 'is-active' : ''}" style="--pin-color:${color}"><span class="radar-pin-score">${fitScore}%</span><span class="radar-pin-core"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[type]}</svg></span></div>`,
  })
}

const centerIcon = L.divIcon({
  className: 'custom-radar-pin',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  html: '<div class="radar-origin-pin"><span></span></div>',
})

export default function RadarMap({ center, radiusKm, leads, selectedLeadId, onLocationChange, onHoverLead, onSelectLead }: RadarMapProps) {
  return (
    <div className="radar-map-root">
      <MapContainer center={center} zoom={12} minZoom={10} maxBounds={JABODETABEK_MAX_BOUNDS} maxBoundsViscosity={1} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
        <FixLeafletIcons />
        <RecenterMap center={center} />
        <MapClickHandler onLocationChange={onLocationChange} />
        <Marker position={center} icon={centerIcon} />
        <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#2563eb', weight: 1.75, fillColor: '#2563eb', fillOpacity: .08, dashArray: '6, 6' }} />
        {leads.map((lead) => <Marker key={lead.id} position={[lead.latitude, lead.longitude]} icon={markerIcon(lead.category, lead.fit_score, selectedLeadId === lead.id)} eventHandlers={{ mouseover: () => onHoverLead(lead), mouseout: () => onHoverLead(null), click: () => onSelectLead(lead) }} />)}
      </MapContainer>
      <div className="radar-map-hint"><span></span>Klik peta untuk pindah koordinat</div>
    </div>
  )
}
