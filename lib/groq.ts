import Groq from 'groq-sdk'
import type { PlacesContext, AnalysisResult } from './types'

const MODEL = 'llama-3.3-70b-versatile'

function buildPrompt(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext,
  score: number
): string {
  const landUseNote = ctx.landUse
    ? `- XƏBƏRDARLIQ: Pin dəqiq olaraq "${ctx.landUse}" ərazisindədir (məsələn, qəbiristanlıq, hərbi zona və s.)`
    : ''

  const metroNote = ctx.metroDistance !== null
    ? `${ctx.metroDistance}m`
    : 'yoxdur'

  const urbanTierAz =
    ctx.urbanTier === 'metro-city' ? 'metro şəhəri'
    : ctx.urbanTier === 'city' ? 'şəhər'
    : ctx.urbanTier === 'town' ? 'qəsəbə'
    : 'kənd/kənar ərazi'

  const prosCount = score > 85 ? 5 : score < 45 ? 2 : 4
  const consCount = score > 85 ? 3 : score < 45 ? 5 : 4
  const prosTemplate = Array.from({ length: prosCount }, (_, i) => `"müsbət cəhət ${i + 1}"`).join(', ')
  const consTemplate = Array.from({ length: consCount }, (_, i) => `"risk ${i + 1}"`).join(', ')

  return `Sən Azərbaycandakı biznes sahələri və yerləri barəsində peşəkar biznes məsləhətçisisən. Aydın Azərbaycan dilində yaz.

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
- Ümumi uğur balı: ${score}/95
${landUseNote}

Qaydalar:
- Hər müsbət cəhət və risk yuxarıdakı konkret məlumatlara (rəqib sayı, ərazi tipi, yaxınlıqdakı obyektlər) əsaslanmalıdır.
- Hər cümlə 20-35 sözdən ibarət olsun — dəqiq, konkret və əsaslı şəkildə.
- Texniki terminlərdən istifadə edə bilərsən.
- Cavabda yalnız aşağıdakı JSON formatı olsun, başqa heç bir mətn əlavə etmə.

Tam olaraq ${prosCount} müsbət cəhət və ${consCount} risk yaz:

{
  "summary": "Bu biznesin bu ərazidə ümumi mənzərəsini bir cümlə ilə ifadə et — konkret olsun.",
  "detail": "5-6 konkret cümlə ilə ətraflı təhlil — rəqabət, trafik, ərazi tipi, inkişaf perspektivi, müştəri potensialı barədə yazılsın. Hər cümlə fərqli aspektə toxunsun.",
  "pros": [${prosTemplate}],
  "cons": [${consTemplate}],
  "verdict": "6 konkret cümlə ilə ümumi qiymətləndirmə — bu biznesin bu ərazidə perspektivi barədə."
}`
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
  return { score, summary: parsed.summary, detail: parsed.detail, pros: parsed.pros, cons: parsed.cons, verdict: parsed.verdict }
}

export async function analyzeLocation(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext,
  score: number
): Promise<AnalysisResult> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set')
  }
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const prompt = buildPrompt(lat, lng, businessType, ctx, score)

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
