'use client'

import { useEffect } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

type Coordinates = [number, number]

type MapLead = {
  id: number
  name: string
  category: string
  latitude: number
  longitude: number
  fit_score: number
}

interface RadarMapProps {
  center: Coordinates
  radiusKm: number
  leads: MapLead[]
  onLocationChange: (coordinates: Coordinates) => void
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
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

function MapClickHandler({ onLocationChange }: Pick<RadarMapProps, 'onLocationChange'>) {
  useMapEvents({
    click: ({ latlng }) => onLocationChange([latlng.lat, latlng.lng]),
  })
  return null
}

export default function RadarMap({ center, radiusKm, leads, onLocationChange }: RadarMapProps) {
  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <FixLeafletIcons />
      <RecenterMap center={center} />
      <MapClickHandler onLocationChange={onLocationChange} />
      <Marker position={center}>
        <Popup>Lokasi scan radar</Popup>
      </Marker>
      <Circle center={center} radius={radiusKm * 1_000} pathOptions={{ color: '#003366', fillColor: '#FFB300', fillOpacity: 0.12 }} />
      {leads.map((lead) => (
        <Marker key={lead.id} position={[lead.latitude, lead.longitude]}>
          <Popup>
            <strong>{lead.name}</strong><br />
            {lead.category} · skor {lead.fit_score}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
