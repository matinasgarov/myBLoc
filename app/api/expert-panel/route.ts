import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { PlacesContext } from '@/lib/types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

interface AgentResponse {
  role: string
  emoji: string
  opinion: string
}

interface RequestBody {
  lat: number
  lng: number
  businessType: string
  score: number
  placesContext: PlacesContext
  luxuryMismatch?: boolean
  rentTierAz?: string
  districtPopulationK?: number
  lang: 'az' | 'en'
}

function buildMarketAnalystPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  if (lang === 'en') {
    return `You are a Market Analyst specializing in Azerbaijani commercial real estate. Write in English only.

Business: ${businessType}
Score: ${score}/95
Competitors within 500m: ${ctx.competitors}
Total businesses in area: ${ctx.totalBusinesses}
Business type recognized in OSM: ${ctx.recognized ? 'yes' : 'no'}
Dominant nearby competitors: ${ctx.dominantCompetitors.length > 0 ? ctx.dominantCompetitors.map(d => `${d.name} (${d.distance}m)`).join(', ') : 'none'}

Write exactly 3-4 sentences analyzing the competitive landscape for this business at this location. Focus only on competition, market saturation, and business density. Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda ticarət daşınmaz əmlakı üzrə ixtisaslaşmış Bazar Analitikisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
500m radiusda rəqib: ${ctx.competitors}
Ərazidəki ümumi müəssisə: ${ctx.totalBusinesses}
Biznes növü tanındı: ${ctx.recognized ? 'bəli' : 'xeyr'}
Yaxın dominant rəqiblər: ${ctx.dominantCompetitors.length > 0 ? ctx.dominantCompetitors.map(d => `${d.name} (${d.distance}m)`).join(', ') : 'yoxdur'}

Bu biznes üçün rəqabət mənzərəsini təhlil edən tam 3-4 cümlə yaz. Yalnız rəqabət, bazar doyumu və müəssisə sıxlığına fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildRiskAdvisorPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, luxuryMismatch, rentTierAz, lang } = body
  const areaTypeEn = ctx.areaType === 'commercial' ? 'commercial' : ctx.areaType === 'mixed' ? 'mixed' : 'residential'
  const areaTypeAz = ctx.areaType === 'commercial' ? 'ticarət' : ctx.areaType === 'mixed' ? 'qarışıq' : 'yaşayış'
  if (lang === 'en') {
    return `You are a Risk Advisor specializing in Azerbaijani business location analysis. Write in English only.

Business: ${businessType}
Score: ${score}/95
Land use restriction: ${ctx.landUse ?? 'none'}
Area type: ${areaTypeEn}
Rent tier: ${rentTierAz ?? 'unknown'}
Luxury/wealth mismatch: ${luxuryMismatch ? 'yes — luxury business in low-wealth district' : 'no'}

Write exactly 3-4 sentences analyzing the key risks for this business at this location. Focus only on land use, area type suitability, rent burden, and wealth/business mismatch. Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda biznes məkan analizinə ixtisaslaşmış Risk Məsləhətçisisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
Torpaq istifadə məhdudiyyəti: ${ctx.landUse ?? 'yoxdur'}
Ərazi tipi: ${areaTypeAz}
Kirayə səviyyəsi: ${rentTierAz ?? 'məlum deyil'}
Lüks/gəlir uyğunsuzluğu: ${luxuryMismatch ? 'bəli — aşağı gəlirli rayonda lüks biznes' : 'xeyr'}

Bu biznes üçün əsas riskləri təhlil edən tam 3-4 cümlə yaz. Yalnız torpaq istifadəsi, ərazi uyğunluğu, kirayə yükü və biznes-ərazi uyğunsuzluğuna fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildLocationStrategistPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, districtPopulationK, lang } = body
  const urbanEn = ctx.urbanTier === 'metro-city' ? 'metro city' : ctx.urbanTier === 'city' ? 'city' : ctx.urbanTier === 'town' ? 'town' : 'rural'
  const urbanAz = ctx.urbanTier === 'metro-city' ? 'metro şəhəri' : ctx.urbanTier === 'city' ? 'şəhər' : ctx.urbanTier === 'town' ? 'qəsəbə' : 'kənd'
  if (lang === 'en') {
    return `You are a Location Strategist specializing in Azerbaijani commercial real estate. Write in English only.

Business: ${businessType}
Score: ${score}/95
Metro distance: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'none'}
Metro daily ridership: ${ctx.metroRidership !== null ? ctx.metroRidership.toLocaleString() : 'no data'}
Major roads nearby: ${ctx.majorRoads}
Urban tier: ${urbanEn}
District population: ${districtPopulationK !== undefined ? `${Math.round(districtPopulationK * 1000).toLocaleString()} people` : 'unknown'}

Write exactly 3-4 sentences analyzing the location strengths for this business. Focus only on metro access, road connectivity, urban tier, and population catchment. Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda ticarət daşınmaz əmlakına ixtisaslaşmış Məkan Strateqisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
Metro məsafəsi: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'yoxdur'}
Metro gündəlik sərnişin: ${ctx.metroRidership !== null ? ctx.metroRidership.toLocaleString() : 'məlumat yoxdur'}
Yaxın böyük yollar: ${ctx.majorRoads}
Şəhər tipi: ${urbanAz}
Rayon əhalisi: ${districtPopulationK !== undefined ? `${Math.round(districtPopulationK * 1000).toLocaleString()} nəfər` : 'məlum deyil'}

Bu biznes üçün məkanın güclü tərəflərini təhlil edən tam 3-4 cümlə yaz. Yalnız metro əlçatanlığı, yol bağlantısı, şəhər tipi və əhali miqdarına fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildCustomerFlowPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  if (lang === 'en') {
    return `You are a Customer Flow Expert specializing in Azerbaijani business location analysis. Write in English only.

Business: ${businessType}
Score: ${score}/95
Bus stops within 500m: ${ctx.busStops}
Parking available: ${ctx.parking > 0 ? 'yes' : 'no'}
Grocery stores within 500m: ${ctx.groceryStores}
Nearby amenities: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'none'}

Write exactly 3-4 sentences analyzing customer flow and accessibility for this business at this location. Focus only on public transport, parking, pedestrian traffic generators (grocery stores, amenities). Be direct and data-driven. Output only your analysis text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda biznes məkan analizinə ixtisaslaşmış Müştəri Axını Ekspertisən. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Biznes: ${businessType}
Bal: ${score}/95
500m-də avtobus dayanacağı: ${ctx.busStops}
Parkinq: ${ctx.parking > 0 ? 'var' : 'yoxdur'}
500m-də ərzaq mağazası: ${ctx.groceryStores}
Yaxın obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'yoxdur'}

Bu biznes üçün müştəri axını və əlçatanlığı təhlil edən tam 3-4 cümlə yaz. Yalnız ictimai nəqliyyat, parkinq, piyada trafik generatorlarına (ərzaq mağazaları, obyektlər) fokuslan. Birbaşa və məlumata əsaslanan ol. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildSynthesizerPrompt(
  agents: AgentResponse[],
  businessType: string,
  score: number,
  lang: 'az' | 'en',
): string {
  const opinions = agents.map(a => `${a.role}: ${a.opinion}`).join('\n\n')
  if (lang === 'en') {
    return `You are a Moderator synthesizing expert opinions about a business location in Azerbaijan.

Business: ${businessType}
Score: ${score}/95

Expert opinions:
${opinions}

Write exactly 2 sentences as your final verdict. Synthesize all expert views into a balanced conclusion. Be direct. Output only your verdict text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda biznes məkanı haqqında ekspert rəylərini ümumiləşdirən Moderatorsən.

Biznes: ${businessType}
Bal: ${score}/95

Ekspert rəyləri:
${opinions}

Yekun qərar kimi tam 2 cümlə yaz. Bütün ekspert baxışlarını balanslaşdırılmış nəticəyə birləşdir. Birbaşa ol. Yalnız qərar mətni yaz, JSON yox, etiket yox.`
}

async function callGroq(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as RequestBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { lat, lng, businessType, score, placesContext } = body
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof businessType !== 'string' ||
    typeof score !== 'number' ||
    !placesContext
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const agentDefs: { role: string; emoji: string; prompt: string }[] = [
      { role: body.lang === 'en' ? 'Market Analyst' : 'Bazar Analitiki',      emoji: '📊', prompt: buildMarketAnalystPrompt(body) },
      { role: body.lang === 'en' ? 'Risk Advisor' : 'Risk Məsləhətçisi',      emoji: '⚠️', prompt: buildRiskAdvisorPrompt(body) },
      { role: body.lang === 'en' ? 'Location Strategist' : 'Məkan Strateqi',  emoji: '🗺️', prompt: buildLocationStrategistPrompt(body) },
      { role: body.lang === 'en' ? 'Customer Flow Expert' : 'Müştəri Axını Eksperti', emoji: '🚶', prompt: buildCustomerFlowPrompt(body) },
    ]

    const opinions = await Promise.all(agentDefs.map(a => callGroq(a.prompt)))

    const agents: AgentResponse[] = agentDefs.map((a, i) => ({
      role: a.role,
      emoji: a.emoji,
      opinion: opinions[i],
    }))

    const verdict = await callGroq(buildSynthesizerPrompt(agents, businessType, score, body.lang ?? 'az'))

    return NextResponse.json({ agents, verdict })
  } catch {
    return NextResponse.json({ agents: [], verdict: '' })
  }
}
