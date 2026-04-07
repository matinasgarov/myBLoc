import Groq from 'groq-sdk'
import type { PlacesContext, AnalysisResult } from './types'
import type { BakuDistrict } from './baku-districts'
import type { RentResult } from './rent'

const MODEL = 'llama-3.3-70b-versatile'

function buildPrompt(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext,
  score: number,
  district: BakuDistrict | null,
  rent: RentResult | null,
): string {
  const landUseNote = ctx.landUse
    ? `- XƏBƏRDARLIQ: Pin dəqiq olaraq "${ctx.landUse}" ərazisindədir (məsələn, qəbiristanlıq, hərbi zona və s.)`
    : ''

  const metroNote = ctx.metroDistance !== null
    ? `${ctx.metroDistance}m`
    : 'yoxdur'

  const districtNote = district
    ? `${district.name} rayonu (${Math.round(district.populationK * 1000).toLocaleString()} nəfər əhali)`
    : 'məlum deyil'

  const rentNote = rent && rent.factorsAz.length > 0
    ? `${rent.tierAz} (${rent.factorsAz.join(' + ')})`
    : rent?.tierAz ?? 'məlum deyil'

  const urbanTierAz =
    ctx.urbanTier === 'metro-city' ? 'metro şəhəri'
    : ctx.urbanTier === 'city' ? 'şəhər'
    : ctx.urbanTier === 'town' ? 'qəsəbə'
    : 'kənd/kənar ərazi'

  const prosCount = score > 85 ? 5 : score < 45 ? 2 : 4
  const consCount = score > 85 ? 3 : score < 45 ? 5 : 4
  const prosTemplate = Array.from({ length: prosCount }, (_, i) => `"müsbət cəhət ${i + 1}"`).join(', ')
  const consTemplate = Array.from({ length: consCount }, (_, i) => `"risk ${i + 1}"`).join(', ')

  return `Sən Azərbaycandakı biznes sahələri və yerləri barəsində peşəkar biznes məsləhətçisisən. Yalnız rəsmi Azərbaycan dilində, latın əlifbası ilə yaz.

Məlumatlar:
- Biznes növü: ${businessType}
- Məkan: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Azərbaycan)
- 500m radiusda rəqib sayı: ${ctx.competitors}
- Yaxınlıqdakı obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'yoxdur'}
- Ərazi tipi: ${ctx.areaType === 'commercial' ? 'ticarət' : ctx.areaType === 'mixed' ? 'qarışıq' : 'yaşayış'} məntəqəsi
- Ərazidəki ümumi müəssisə sayı: ${ctx.totalBusinesses}
- Metro məsafəsi: ${metroNote}
- Metro gündəlik sərnişin: ${ctx.metroRidership !== null ? ctx.metroRidership.toLocaleString() : 'məlumat yoxdur'}
- Bus dayanacağı (500m): ${ctx.busStops}
- Ərzaq mağazası (500m): ${ctx.groceryStores}
- Parkinq (500m): ${ctx.parking > 0 ? 'var' : 'yoxdur'}
- Şəhər tipi: ${urbanTierAz}
- Rayon və əhali: ${districtNote}
- Kira qiymət səviyyəsi: ${rentNote}
- Ümumi uğur balı: ${score}/95
${landUseNote}

Qaydalar:
- Hər müsbət cəhət və risk yuxarıdakı konkret məlumatlara (rəqib sayı, ərazi tipi, yaxınlıqdakı obyektlər) əsaslanmalıdır.
- Hər müsbət cəhət (pros): ən azı 10 sözdən ibarət tam cümlə olsun.
- Hər risk (cons): ən azı 10 sözdən ibarət tam, izahlı cümlə olsun — riskin niyə mövcud olduğunu izah et.
- Cavabda yalnız aşağıdakı JSON formatı olsun, başqa heç bir mətn əlavə etmə.
- DİL: Yalnız latın əlifbası ilə Azərbaycan dili. KİRİL hərflər (rus, ukrayna, erməni) TAMAMILƏ QADAĞANDIR. Rusca söz, ifadə, ad yazmaq qadağandır.
- DİL QAYDAları: "çoxluq" sözünü ismin önündə işlətmə — əvəzinə "çoxlu" işlət (düzgün: "çoxlu rəqib", "çoxlu müştəri"; yanlış: "çoxluq rəqib"). Düzgün formalar: "şiddətli rəqabət", "yüksək müştəri axını", "aşağı trafik", "geniş müştəri kütləsi", "az rəqib", "sıx ticarət məntəqəsi".
- PARKINQ QAYDASİ: Parkinq mövcudluğu HƏMIŞƏ müsbət amildir. Onu yalnız müsbət cəhətlər (pros) arasında göstər — risklərdə (cons) QADAĞANDIR.
- MÜTLƏQİ QADAĞA — ZİDDİYYƏTLİ BƏYANATLAR: Rəqib sayı ${ctx.competitors}-dir. ${ctx.competitors > 0 ? `Bu rəqəm sıfırdan böyük olduğundan, müsbət cəhətlərdə "rəqib yoxdur", "tək müəssisə olaraq fərqlənə bilər", "rəqabət azdır" və ya oxşar ifadələr TAMAMILƏ QADAĞANDIR.` : `Bu rəqəm sıfır olduğundan, risklərdə "çoxlu rəqib", "şiddətli rəqabət" və ya oxşar ifadələr TAMAMILƏ QADAĞANDIR.`}
- Rəqabət barəsindəki bütün bəyanatlar yalnız yuxarıda göstərilən ${ctx.competitors} rəqib sayını əks etdirməlidir — fərqli rəqəm və ya əks fikir yazmaq qadağandır.

Tam olaraq ${prosCount} müsbət cəhət və ${consCount} risk yaz:

{
  "summary": "Bu biznesin bu ərazidə ümumi mənzərəsini bir cümlə ilə ifadə et — konkret olsun.",
  "detail": "5-6 konkret cümlə ilə ətraflı təhlil — rəqabət, trafik, ərazi tipi, inkişaf perspektivi, müştəri potensialı barədə yazılsın. Hər cümlə fərqli aspektə toxunsun. Son iki cümləni aşağıdakı formata uyğun yaz: • Bu ərazidə kira səviyyəsi ${rentNote}-dir. • ${districtNote.split('(')[0].trim()} əhalisinin böyüklüyü müştəri potensialına müsbət təsir edir.",
  "pros": [${prosTemplate}],
  "cons": [${consTemplate}],
  "verdict": "6 konkret cümlə ilə ümumi qiymətləndirmə — bu biznesin bu ərazidə perspektivi barədə."
}`
}

/** Known Azerbaijani grammar errors the LLM produces → correct form */
const AZ_CORRECTIONS: [RegExp, string][] = [
  [/çoxluq\s+/gi, 'çoxlu '],
  [/çoxluğu\s+/gi, 'çoxluğu '],
  [/güclü\s+rəqabət\s+sayı/gi, 'yüksək rəqib sayı'],
  [/böyük\s+rəqabət\s+sayı/gi, 'yüksək rəqib sayı'],
  [/yüksək\s+sayda\s+rəqib/gi, 'çoxlu rəqib'],
  [/çox\s+sayda\s+rəqib/gi, 'çoxlu rəqib'],
  [/çox\s+sayda\s+müştəri/gi, 'çoxlu müştəri'],
  [/\bsay\s+çoxdur\b/gi, 'sayı çoxdur'],
  // Parking must stay positive — strip any "risk" framing
  [/parkinq\s+mövcudluğu[^.]*?xərc[^.]*\./gi, ''],
  [/parkinq\s+(?:əlavə\s+)?xərc[^.]*\./gi, ''],
  // Common unnatural phrasings
  [/\bkomersiya\b/gi, 'ticarət'],
  [/\bpozitiv\b/gi, 'müsbət'],
  [/\bnegativ\b/gi, 'mənfi'],
  [/\bpotensial\s+müştərilər\b/gi, 'potensial müştəri kütləsi'],
  [/\byüksək\s+rəqabət\s+mühiti\b/gi, 'rəqabətli mühit'],
  [/\binfrastruktur\s+çatışmazlığı\b/gi, 'infrastruktur imkanlarının məhdudluğu'],
]

function fixAzerbaijaniGrammar(text: string): string {
  let out = text
  for (const [pattern, replacement] of AZ_CORRECTIONS) {
    out = out.replace(pattern, replacement)
  }
  // Strip any Cyrillic characters that slipped through (Russian words, etc.)
  out = out.replace(/[\u0400-\u04FF]+/g, '').replace(/\s{2,}/g, ' ').trim()
  return out
}

function fixStrings<T>(obj: T): T {
  if (typeof obj === 'string') return fixAzerbaijaniGrammar(obj) as unknown as T
  if (Array.isArray(obj)) return obj.map((item) => fixStrings(item)) as unknown as T
  return obj
}

function parseResponse(content: string, score: number): AnalysisResult {
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as Omit<AnalysisResult, 'score' | 'factors'>
  if (
    typeof parsed.summary !== 'string' ||
    typeof parsed.detail !== 'string' ||
    !Array.isArray(parsed.pros) ||
    !Array.isArray(parsed.cons) ||
    typeof parsed.verdict !== 'string'
  ) {
    throw new Error('Invalid response shape')
  }
  return {
    score,
    summary: fixStrings(parsed.summary),
    detail: fixStrings(parsed.detail),
    pros: fixStrings(parsed.pros),
    cons: fixStrings(parsed.cons),
    verdict: fixStrings(parsed.verdict),
  }
}

export async function analyzeLocation(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext,
  score: number,
  district?: BakuDistrict | null,
  rent?: RentResult | null,
): Promise<AnalysisResult> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set')
  }
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const prompt = buildPrompt(lat, lng, businessType, ctx, score, district ?? null, rent ?? null)

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = response.choices[0]?.message?.content || ''
    try {
      return parseResponse(content, score)
    } catch {
      if (attempt === 1) throw new Error('Groq returned invalid JSON after 2 attempts')
    }
  }
  throw new Error('Groq returned invalid JSON after 2 attempts')
}
