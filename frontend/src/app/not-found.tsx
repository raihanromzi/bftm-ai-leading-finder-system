import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
      <p style={{ fontSize: 14, color: '#6B7280' }}>Halaman tidak ditemukan.</p>
      <Link href="/" style={{ fontSize: 13, color: '#003366', fontWeight: 600 }}>Kembali ke Radar</Link>
    </div>
  )
}
