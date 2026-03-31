import Groq from 'groq-sdk'
import type { PlacesContext, AnalysisResult } from './types'

const MODEL = 'llama-3.1-8b-instant'

function buildPrompt(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext,
  score: number
): string {
  return `Sən biznes məsləhətçisisən. Sadə, aydın Azərbaycan dilində yaz — sanki dostuna izah edirsən.

Məlumatlar:
- Biznes növü: ${businessType}
- Məkan: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Azərbaycan)
- 500m radiusda rəqib sayı: ${ctx.competitors}
- Yaxınlıqdakı obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'yoxdur'}
- Ərazi tipi: ${ctx.areaType === 'commercial' ? 'ticarət' : ctx.areaType === 'mixed' ? 'qarışıq' : 'yaşayış'} məntəqəsi
- Ərazidəki ümumi müəssisə sayı: ${ctx.totalBusinesses}
- Ümumi bal: ${score}/100

3 qısa müsbət cəhət və 3 qısa risk yaz. Hər cümlə maksimum 10-12 sözdən ibarət olsun. Texniki termin işlətmə. Yalnız bu JSON formatında cavab ver:
{
  "pros": ["müsbət cəhət 1", "müsbət cəhət 2", "müsbət cəhət 3"],
  "cons": ["risk 1", "risk 2", "risk 3"],
  "verdict": "Bir sadə cümlə ilə ümumi qiymətləndirmə."
}`
}

function parseResponse(content: string, score: number): AnalysisResult {
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as Omit<AnalysisResult, 'score'>
  if (
    !Array.isArray(parsed.pros) ||
    !Array.isArray(parsed.cons) ||
    typeof parsed.verdict !== 'string'
  ) {
    throw new Error('Invalid response shape')
  }
  return { score, pros: parsed.pros, cons: parsed.cons, verdict: parsed.verdict }
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
  return undefined as never
}
