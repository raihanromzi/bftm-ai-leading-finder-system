# BFTM Radar — UI & Design System Specification (`design.md`)

## 1. Design Philosophy & Aesthetic Direction
* **Archetype:** Map-First Spatial Intelligence & Territory Prospecting Tool (inspired by Apple Maps, Linear, and Stripe).
* **Core Principle:** The map canvas occupies `100vw × 100vh`. All controls, filters, and prospect lists live inside translucent, floating glassmorphic panels with subtle hairline borders rather than rigid split-screen sidebars.
* **Google Maps Integration Rule:** Native Google Maps UI controls (`zoomControl`, `mapTypeControl`, `streetViewControl`, `fullscreenControl`) **must be completely disabled** (`disableDefaultUI: true`). All map interactions are handled through custom-styled floating controls and `<AdvancedMarker>` components.

---

## 2. Design Tokens

### 2.1 Color Palette
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F4F6F9` | Base application / map fallback background |
| `--surface-glass` | `rgba(255, 255, 255, 0.92)` | Floating sidebar, detail cards, and control pills |
| `--surface-subtle` | `#F8FAFC` | Secondary button fill, footer summary bar, stat wells |
| `--surface-hover` | `#F1F5F9` | Hover state for list cards, inputs, and secondary buttons |
| `--border-hairline` | `rgba(15, 23, 42, 0.08)` | Outer borders for floating cards and icon controls |
| `--border-control` | `#E2E8F0` | Input fields, dropdowns, and inactive filter chips |
| `--text-primary` | `#0F172A` | Headings, primary button fill, active filter chips |
| `--text-secondary` | `#475569` | Subtitles, metadata, inactive chip labels |
| `--text-muted` | `#94A3B8` | Placeholders, micro-labels, map secondary labels |
| `--accent-cobalt` | `#2563EB` | Radar radius stroke/fill, active slider track, primary pins |
| `--accent-sky` | `#38BDF8` | Center branch marker core & active scan icon highlight |
| `--status-teal` | `#0D9488` | Category indicator: *Ritel & F&B* |
| `--status-amber` | `#D97706` | Category indicator: *Industri* |
| `--status-emerald` | `#10B981` | Closing status indicator & confirmation toasts |

### 2.2 Typography
* **UI Sans:** `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
* **Monospace / Tabular:** `'JetBrains Mono', monospace` with `font-variant-numeric: tabular-nums` (strictly used for coordinates, distances in `km`, entity counts, and estimated revenue potential).

| Role | Font | Size | Weight | Tracking / Line Height |
| :--- | :--- | :--- | :--- | :--- |
| App Title | Inter | `16px` | `600` (SemiBold) | `-0.01em` / `1.2` |
| Section Header | Inter | `13px` | `600` (SemiBold) | `0` / `1.3` |
| Micro Label | Inter | `11px` | `500` (Medium) | `+0.05em` (Uppercase) |
| Body / Control | Inter | `13px` | `500` (Medium) | `0` / `1.4` |
| Caption / Address | Inter | `11.5px` | `400` (Regular) | `0` / `1.4` |
| Numeric Badge / Coords | JetBrains Mono | `11px – 12px` | `500 – 600` | `0` / `1.2` |

### 2.3 Elevation, Blur & Radii
* **Glass Blur:** `backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);`
* **Panel Shadow:** `0 12px 36px -4px rgba(15, 23, 42, 0.09), 0 2px 6px rgba(15, 23, 42, 0.04)`
* **Control Shadow:** `0 4px 12px rgba(15, 23, 42, 0.05)`
* **Border Radii (Strict):**
  * Floating Panels & Popovers: `16px`
  * Prospect List Cards: `12px`
  * All Buttons, Inputs, Selects, Chips & Coordinate Pill: `10px`
  * Status Pills & Badges: `9999px` (Full pill)

---

## 3. Component Primitives (Strict Enforcement)
To prevent visual drift or mismatched buttons across views, **every interactive button must inherit from one of these exact classes**:

### 3.1 Primary Button (`.btn-primary`)
* **Usage:** Primary actions (*"Pindai wilayah"*, *"Jadwalkan"*).
* **Specs:**
  * Height: `40px` | Padding: `0 16px` | Border-radius: `10px`
  * Background: `#0F172A` (Hover: `#1E293B`)
  * Text: `#FFFFFF`, `13px`, `font-weight: 500`
  * Shadow: `inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 1px 2px rgba(15, 23, 42, 0.12)`
  * Transition: `all 150ms cubic-bezier(0.16, 1, 0.3, 1)`

### 3.2 Secondary Button (`.btn-secondary`)
* **Usage:** Secondary card actions (*"Detail"*, *"Reset"*).
* **Specs:**
  * Height: `40px` | Padding: `0 14px` | Border-radius: `10px`
  * Background: `#F8FAFC` (Hover: `#F1F5F9`)
  * Border: `1px solid #E2E8F0` (Hover: `#CBD5E1`)
  * Text: `#0F172A`, `13px`, `font-weight: 500`

### 3.3 Icon Control Button (`.btn-icon`)
* **Usage:** Export icon in header, Zoom In (`+`), Zoom Out (`-`), and Recenter (`Crosshair`) controls.
* **Specs:**
  * Dimensions: `40px × 40px` square | Border-radius: `10px`
  * Background: `rgba(255, 255, 255, 0.94)` (Hover: `#FFFFFF`)
  * Border: `1px solid rgba(15, 23, 42, 0.08)`
  * Icon: `17px` Lucide icon in `#334155` (Hover: `#0F172A`)

### 3.4 Category Filter Chips
* **Layout:** `2 × 2` grid (`gap: 6px`).
* **Specs:** Height `34px`, radius `10px`, `padding: 0 10px`, `12px` font-weight `500`.
* **States:**
  * *Inactive:* `bg: rgba(255, 255, 255, 0.7)`, `border: 1px solid rgba(226, 232, 240, 0.8)`, `text: #475569`.
  * *Active:* `bg: #0F172A`, `border: #0F172A`, `text: #FFFFFF`, right-aligned count badge in `rgba(255, 255, 255, 0.15)`.

---

## 4. Spatial Architecture & Layout Zones

1. **Full-Viewport Map Canvas (`z-index: 0`):**
   * `100vw × 100vh`, `overflow: hidden`.
   * Renders Google Maps with a desaturated, minimalist light style (subtle `#F4F6F9` land, `#DBEAFE` water, `#FFFFFF` primary arteries, muted POI labels).
2. **Left Floating Control Panel (`z-index: 20`):**
   * Fixed `top: 16px`, `left: 16px`, `bottom: 16px`, `width: 380px`.
   * **Section A (Header):** App title + `LIVE` badge, active city & radius readout, and `40×40px` Export `.btn-icon`.
   * **Section B (Radar Controls):** *Kantor cabang* `<select>` (`40px` height), *Jangkauan* range slider (`2–25 km`) with monospace badge, and full-width `.btn-primary` (*"Pindai wilayah"*).
   * **Section C (Filter & Search):** Search input (`38px` height) + `2×2` category filter grid (*Semua prospek*, *Sekolah & kampus*, *Ritel & F&B*, *Industri*).
   * **Section D (Scrollable Results):** Header with entity count + priority pill, followed by either a centered empty-state prompt or interactive prospect cards.
   * **Section E (Pinned Footer):** Fixed bottom summary bar displaying `prioritas`, `kunjungan`, and `closing` counts in monospace.
3. **Top-Right Instruction Pill (`z-index: 10`):**
   * Fixed `top: 16px`, `right: 16px`, `height: 38px`, `border-radius: 9999px`.
   * Displays a pulsing `#2563EB` dot + *"Klik peta untuk pindah koordinat"*.
4. **Bottom-Right Map Controls (`z-index: 10`):**
   * Fixed `bottom: 16px`, `right: 16px`.
   * Vertical stack (`gap: 6px`) of three `40×40px` `.btn-icon` buttons (Recenter, Zoom In, Zoom Out) positioned directly above a `34px`-tall monospace coordinate readout pill (`lat, lng`).
5. **Selected Prospect Popover (`z-index: 20`):**
   * Appears at `bottom: 16px`, `left: 412px` (`width: 340px`) when clicking a map marker or sidebar card, displaying address, estimated potential, distance, and `.btn-primary` + `.btn-secondary` actions.

---

## 5. Google Maps Specific Styling & Overlays
* **Radar Coverage Overlay (`google.maps.Circle`):**
  * `strokeColor: '#2563EB'`, `strokeOpacity: 0.85`, `strokeWeight: 1.75`
  * `fillColor: '#2563EB'`, `fillOpacity: 0.08`
* **Center Origin Marker (`AdvancedMarker`):**
  * `22px` `#0F172A` circle with `2.5px` `#FFFFFF` border, `#38BDF8` inner core, and soft `#2563EB` outer halo.
* **Prospect Markers (`AdvancedMarker`):**
  * `16px` `#FFFFFF` circle (`20px` inverted `#0F172A` when selected) with a `2.5px` category-colored border (`#2563EB` Sekolah, `#0D9488` Ritel, `#D97706` Industri).