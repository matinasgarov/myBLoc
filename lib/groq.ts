import Groq from 'groq-sdk'
import type { PlacesContext, AnalysisResult } from './types'

const MODEL = 'llama3-8b-8192'

function buildPrompt(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext
): string {
  return `Sən biznes məsləhətçisisən. Aşağıdakı məlumatlar əsasında Azərbaycanda göstərilən yerdə biznesin uğur ehtimalını qiymətləndir.

Məkan: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Azərbaycan)
Biznes növü: ${businessType}
Yaxınlıqdakı məlumatlar:
- 500m radiusda oxşar müəssisələr: ${ctx.competitors}
- Ərazi tipi: ${ctx.areaType}
- Yaxınlıqdakı obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'məlumat yoxdur'}
- Ərazidəki ümumi müəssisə sayı: ${ctx.totalBusinesses}

Yalnız JSON formatında cavab ver (başqa heç nə yazma):
{
  "score": <0-100 arası tam rəqəm>,
  "pros": ["müsbət cəhət 1", "müsbət cəhət 2", "müsbət cəhət 3"],
  "cons": ["risk 1", "risk 2", "risk 3"],
  "verdict": "Bir cümlə ilə ümumi qiymətləndirmə."
}

Bütün mətn Azərbaycan dilində olmalıdır.`
}

function parseResponse(content: string): AnalysisResult {
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as AnalysisResult
  if (
    typeof parsed.score !== 'number' ||
    !Array.isArray(parsed.pros) ||
    !Array.isArray(parsed.cons) ||
    typeof parsed.verdict !== 'string'
  ) {
    throw new Error('Invalid response shape')
  }
  return parsed
}

export async function analyzeLocation(
  lat: number,
  lng: number,
  businessType: string,
  ctx: PlacesContext
): Promise<AnalysisResult> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set')
  }
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const prompt = buildPrompt(lat, lng, businessType, ctx)

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = response.choices[0]?.message?.content || ''
    try {
      return parseResponse(content)
    } catch {
      if (attempt === 1) throw new Error('Groq returned invalid JSON after 2 attempts')
    }
  }
  // TypeScript control flow: the throw in the loop always executes, this is unreachable
  return undefined as never
}
