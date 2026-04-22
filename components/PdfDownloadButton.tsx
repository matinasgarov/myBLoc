'use client'
import type { AnalysisResult, PlacesContext } from '@/lib/types'

interface Props {
  business: string
  result: AnalysisResult
  context: PlacesContext | null
  label: string
  lat?: number
  lng?: number
}

const FACTOR_LABELS: Record<string, string> = {
  competition: 'Rəqabət',
  footTraffic: 'Piyada Axını',
  areaType: 'Ərazi Tipi',
  urbanTier: 'Şəhər Tipi',
  accessibility: 'Əlçatanlıq',
  nearbyServices: 'Yaxın Xidmətlər',
  businessDensity: 'Biznes Sıxlığı',
}

function scoreHex(score: number): string {
  if (score >= 70) return '#34d399'
  if (score >= 40) return '#fbbf24'
  return '#f87171'
}

async function loadAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  // Chunk-based encoding avoids stack overflow on large font files (~295 KB)
  const CHUNK = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export default function PdfDownloadButton({ business, result, context, label, lat, lng }: Props) {
  async function handleDownload() {
    try {
    const { jsPDF } = await import('jspdf')

    // Load full Roboto fonts that cover all Azerbaijani Latin characters
    // (ə U+0259, ğ U+011F, ı U+0131, İ U+0130, ş U+015F, ç U+00E7, ö U+00F6, ü U+00FC)
    const [regularB64, boldB64] = await Promise.all([
      loadAsBase64('/fonts/Roboto-Regular.ttf'),
      loadAsBase64('/fonts/Roboto-Bold.ttf'),
    ])

    // Try loading the logo (fails gracefully if file not present)
    let logoB64: string | null = null
    try {
      logoB64 = await loadAsBase64('/logo.png')
    } catch {
      // no logo file — fall back to text-only brand mark
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    doc.addFileToVFS('Roboto-Regular.ttf', regularB64)
    doc.addFileToVFS('Roboto-Bold.ttf', boldB64)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
    const fontFamily = 'Roboto'

    const NAV = '#0f172a'
    const ACCENT = '#1035b9'
    const TEXT = '#1e293b'
    const LIGHT = '#64748b'
    const RULE = '#e2e8f0'
    const W = 210
    const M = 18
    const R = W - M

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFillColor(NAV)
    doc.rect(0, 0, W, 26, 'F')

    if (logoB64) {
      // Logo: 319×330 px → ratio ≈1:1 → 14×14 mm, vertically centred in 26mm header
      doc.addImage(logoB64, 'PNG', M, 6, 14, 14)
    } else {
      doc.setFont(fontFamily, 'bold')
      doc.setFontSize(14)
      doc.setTextColor('#ffffff')
      doc.text(String('myblocate.'), M, 16)
    }

    doc.setFont(fontFamily, 'normal')
    doc.setFontSize(8)
    doc.setTextColor('#94a3b8')
    const date = new Date().toLocaleDateString('az-AZ', { year: 'numeric', month: 'long', day: 'numeric' })
    doc.text(date, R, 16, { align: 'right' })

    // ── Score block ──────────────────────────────────────────────────────────
    const safeScore = result.score ?? 0
    const safeBusiness = business || 'Biznes'
    const safePros = result.pros ?? []
    const safeCons = result.cons ?? []

    let y = 36
    doc.setFont(fontFamily, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(LIGHT)
    doc.text('BİZNES NÖVÜ', M, y)
    y += 5
    doc.setFont(fontFamily, 'bold')
    doc.setFontSize(13)
    doc.setTextColor(TEXT)
    doc.text(safeBusiness, M, y)
    y += 3

    // Score pill (right-aligned)
    const scoreColor = scoreHex(safeScore)
    doc.setFillColor(scoreColor)
    doc.roundedRect(R - 28, 31, 28, 14, 3, 3, 'F')
    doc.setFont(fontFamily, 'bold')
    doc.setFontSize(14)
    doc.setTextColor('#ffffff')
    doc.text(`${safeScore}%`, R - 14, 40, { align: 'center' })
    doc.setFontSize(6)
    doc.text('UĞUR EHTİMALI', R - 14, 43.5, { align: 'center' })

    y += 6
    // Rent tier row (district name intentionally omitted)
    if (result.rentTierAz) {
      doc.setFont(fontFamily, 'normal')
      doc.setFontSize(8)
      doc.setTextColor(LIGHT)
      doc.text(`Kira: ${result.rentTierAz}`, M, y)
      y += 6
    }

    // Coordinates row
    if (lat !== undefined && lng !== undefined) {
      doc.setFont(fontFamily, 'normal')
      doc.setFontSize(8)
      doc.setTextColor(LIGHT)
      const latDir = lat >= 0 ? 'N' : 'S'
      const lngDir = lng >= 0 ? 'E' : 'W'
      doc.text(`Koordinatlar: ${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`, M, y)
      y += 6
    }

    // Rule
    doc.setDrawColor(RULE)
    doc.setLineWidth(0.3)
    doc.line(M, y, R, y)
    y += 6

    // ── Summary ───────────────────────────────────────────────────────────────
    if (result.summary) {
      doc.setFont(fontFamily, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(TEXT)
      const sumLines = doc.splitTextToSize(String(result.summary), R - M)
      doc.text(sumLines, M, y)
      y += sumLines.length * 4.5 + 4
    }

    // ── Pros / Cons in two columns ────────────────────────────────────────────
    const colW = (R - M - 6) / 2
    const colR = M + colW + 6

    doc.setFont(fontFamily, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(ACCENT)
    doc.text('MÜSBƏTLƏRİ', M, y)
    doc.setTextColor('#ef4444')
    doc.text('RİSKLƏR', colR, y)
    y += 4

    const maxItems = Math.max(safePros.length, safeCons.length)
    doc.setFont(fontFamily, 'normal')
    doc.setFontSize(8)

    for (let i = 0; i < maxItems; i++) {
      const pro = safePros[i]
      const con = safeCons[i]
      const proLines = pro ? doc.splitTextToSize(`+ ${String(pro)}`, colW) : []
      const conLines = con ? doc.splitTextToSize(`— ${String(con)}`, colW) : []
      const lh = Math.max(proLines.length, conLines.length) * 4 + 1

      if (y + lh > 275) {
        doc.addPage()
        y = 18
      }

      if (proLines.length) {
        doc.setTextColor('#059669')
        doc.text(proLines, M, y)
      }
      if (conLines.length) {
        doc.setTextColor('#dc2626')
        doc.text(conLines, colR, y)
      }
      y += lh
    }

    y += 4
    doc.setDrawColor(RULE)
    doc.line(M, y, R, y)
    y += 6

    // ── Factor Breakdown ─────────────────────────────────────────────────────
    if (result.factors && result.factors.length > 0) {
      doc.setFont(fontFamily, 'bold')
      doc.setFontSize(8)
      doc.setTextColor(LIGHT)
      doc.text('FAKTOR BÖLGÜSÜ', M, y)
      y += 5

      const barW = 80
      for (const f of result.factors) {
        if (y > 270) { doc.addPage(); y = 18 }
        const pct = f.score / f.max
        const factorLabel = FACTOR_LABELS[f.key] ?? f.key

        doc.setFont(fontFamily, 'normal')
        doc.setFontSize(8)
        doc.setTextColor(TEXT)
        doc.text(factorLabel, M, y)

        // Track
        doc.setFillColor('#e2e8f0')
        doc.roundedRect(M + 42, y - 3, barW, 3, 1, 1, 'F')
        // Fill
        const fillColor = pct >= 0.7 ? '#10b981' : pct >= 0.4 ? '#f59e0b' : '#ef4444'
        doc.setFillColor(fillColor)
        if (pct > 0) {
          doc.roundedRect(M + 42, y - 3, barW * pct, 3, 1, 1, 'F')
        }

        doc.setTextColor(LIGHT)
        doc.text(`${f.score}/${f.max}`, M + 42 + barW + 3, y)

        y += 6
      }
      y += 2
    }

    // ── OSM Data ──────────────────────────────────────────────────────────────
    if (context) {
      if (y + 30 > 275) { doc.addPage(); y = 18 }
      doc.setDrawColor(RULE)
      doc.line(M, y, R, y)
      y += 6

      doc.setFont(fontFamily, 'bold')
      doc.setFontSize(8)
      doc.setTextColor(LIGHT)
      doc.text('OSM MƏLUMATLARİ', M, y)
      y += 5

      const osmItems = [
        ['Rəqib', String(context.competitors)],
        ['Müəssisə', String(context.totalBusinesses)],
        ['Avtobus dayanacağı', String(context.busStops)],
        ['Ərzaq mağazası', String(context.groceryStores)],
        ['Parkinq', context.parking > 0 ? 'Var' : 'Yoxdur'],
        ['Metro', context.metroDistance !== null ? `${context.metroDistance}m` : '—'],
      ]

      const cellW = (R - M) / 3
      for (let i = 0; i < osmItems.length; i++) {
        const col = i % 3
        const row = Math.floor(i / 3)
        const cx = M + col * cellW
        const cy = y + row * 12

        doc.setFillColor('#f8fafc')
        doc.setDrawColor(RULE)
        doc.roundedRect(cx, cy - 3, cellW - 2, 10, 1, 1, 'FD')

        doc.setFont(fontFamily, 'bold')
        doc.setFontSize(10)
        doc.setTextColor(TEXT)
        doc.text(osmItems[i][1], cx + (cellW - 2) / 2, cy + 2, { align: 'center' })

        doc.setFont(fontFamily, 'normal')
        doc.setFontSize(6)
        doc.setTextColor(LIGHT)
        doc.text(osmItems[i][0].toUpperCase(), cx + (cellW - 2) / 2, cy + 5.5, { align: 'center' })
      }
      y += 30
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.setFont(fontFamily, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(LIGHT)
    doc.text('myblocate.com  ·  Bu hesabat məlumat xarakter daşıyır.', W / 2, 290, { align: 'center' })

    const filename = `myblocate-${safeBusiness.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'report'}.pdf`
    doc.save(filename)
    } catch (err) {
      console.error('[PdfDownloadButton] PDF generation failed:', err)
      alert('Hesabat yaradılarkən xəta baş verdi')
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="w-full py-4 text-sm text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800 border-b border-slate-800/60 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest font-semibold"
    >
      ↓ {label}
    </button>
  )
}
