import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { PlacesContext } from '@/lib/types'
import { isRateLimited, isRateLimitedDaily, extractIp, extractRateKey, isCrossOrigin, tooLarge } from '@/lib/ratelimit'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

const MAX_BODY_BYTES = 20_000
const NO_STORE = { 'Cache-Control': 'no-store, private' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

interface AgentResponse {
  role: string
  emoji: string
  opinion: string
  response: string
  confidence: number
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

function buildRoundTwoPrompt(
  agent: { role: string; opinion: string },
  otherAgents: { role: string; opinion: string }[],
  lang: 'az' | 'en',
): string {
  const othersText = otherAgents.map(o => `${o.role}: ${o.opinion}`).join('\n\n')
  if (lang === 'en') {
    return `You are ${agent.role}. You previously stated:
"${agent.opinion}"

Now you've heard from your fellow experts:
${othersText}

Write exactly 2-3 sentences responding to what the others said. Agree or push back on a specific point another expert made. Stay in your own domain. Output only your response, no JSON, no labels.`
  }
  return `Sən ${agent.role}. Öncə dedin:
"${agent.opinion}"

İndi digər ekspertləri dinlədin:
${othersText}

Digərlərinin dediklərinə cavab olaraq tam 2-3 cümlə yaz. Başqa bir ekspertin konkret fikri ilə razılaş və ya ona etiraz et. Öz sahəndə qal. Yalnız cavab mətni yaz, JSON yox, etiket yox.`
}

function buildSynthesizerPrompt(
  agents: AgentResponse[],
  businessType: string,
  score: number,
  lang: 'az' | 'en',
): string {
  const discussion = agents.map(a =>
    `${a.role}:\nInitial: ${a.opinion}\nAfter discussion: ${a.response}`
  ).join('\n\n')
  if (lang === 'en') {
    return `You are a Moderator synthesizing a panel discussion about a business location in Azerbaijan.

Business: ${businessType}
Score: ${score}/95

Panel discussion:
${discussion}

Write exactly 2 sentences as your final verdict. Synthesize the full discussion into a balanced conclusion. Be direct. Output only your verdict text, no JSON, no labels.`
  }
  return `Sən Azərbaycanda biznes məkanı haqqında panel müzakirəsini ümumiləşdirən Moderatorsən.

Biznes: ${businessType}
Bal: ${score}/95

Panel müzakirəsi:
${discussion}

Yekun qərar kimi tam 2 cümlə yaz. Bütün müzakirəni balanslaşdırılmış nəticəyə birləşdir. Birbaşa ol. Yalnız qərar mətni yaz, JSON yox, etiket yox.`
}

async function callGroq(prompt: string, maxTokens = 300): Promise<string> {
  const res = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

function buildConfidencePrompt(role: string, opinion: string, lang: 'az' | 'en'): string {
  if (lang === 'en') {
    return `You are ${role}. Your analysis was:
"${opinion}"

Rate your confidence in this assessment on a scale from 0 to 10, where 0 = very uncertain and 10 = highly confident. Consider data availability and potential confounding factors. Reply with only a single integer between 0 and 10, nothing else.`
  }
  return `Sən ${role}. Sənin analizin:
"${opinion}"

Bu qiymətləndirmədəki inamını 0-dan 10-a qədər qiymətləndir: 0 = çox qeyri-müəyyən, 10 = çox əmindir. Yalnız 0 ilə 10 arasında bir tam ədəd yaz, başqa heç nə yox.`
}

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req)) return json({ error: 'Forbidden' }, 403)
  if (tooLarge(req, MAX_BODY_BYTES)) return json({ error: 'Payload too large' }, 413)
  const ip = extractIp(req)
  const rateKey = extractRateKey(req)
  if (await isRateLimited(rateKey, 4, 60_000, 'expert-min'))
    return json({ error: 'Too many requests' }, 429)
  if (await isRateLimitedDaily(ip, 20, 'expert-day'))
    return json({ error: 'Daily limit reached' }, 429)

  const body = await req.json().catch(() => null) as RequestBody | null
  if (!body) return json({ error: 'Invalid JSON' }, 400)

  const { lat, lng, businessType, score, placesContext } = body
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof businessType !== 'string' ||
    typeof score !== 'number' ||
    !placesContext
  ) {
    return json({ error: 'Missing required fields' }, 400)
  }

  const lang: 'az' | 'en' = body.lang === 'en' ? 'en' : 'az'

  const safeBody: RequestBody = {
    ...body,
    lang,
    businessType: body.businessType.replace(/[\n\r`]/g, ' ').trim(),
    placesContext: {
      ...body.placesContext,
      landUse: body.placesContext.landUse?.replace(/[\n\r`]/g, ' ').trim() ?? null,
    },
  }

  try {
    const agentDefs: { role: string; emoji: string; prompt: string }[] = [
      { role: lang === 'en' ? 'Market Analyst' : 'Bazar Analitiki',      emoji: '📊', prompt: buildMarketAnalystPrompt(safeBody) },
      { role: lang === 'en' ? 'Risk Advisor' : 'Risk Məsləhətçisi',      emoji: '⚠️', prompt: buildRiskAdvisorPrompt(safeBody) },
      { role: lang === 'en' ? 'Location Strategist' : 'Məkan Strateqi',  emoji: '🗺️', prompt: buildLocationStrategistPrompt(safeBody) },
      { role: lang === 'en' ? 'Customer Flow Expert' : 'Müştəri Axını Eksperti', emoji: '🚶', prompt: buildCustomerFlowPrompt(safeBody) },
    ]

    // Round 1: parallel independent analysis
    const round1Opinions = await Promise.all(agentDefs.map(a => callGroq(a.prompt)))
    const round1Agents = agentDefs.map((a, i) => ({ role: a.role, emoji: a.emoji, opinion: round1Opinions[i] }))

    // Round 2: each agent reads the other 3 and responds
    const round2Responses = await Promise.all(
      round1Agents.map((agent, i) => {
        const others = round1Agents.filter((_, j) => j !== i)
        return callGroq(buildRoundTwoPrompt(agent, others, lang))
      })
    )

    // Round 3: confidence ratings (parallel, short calls)
    const confidenceResponses = await Promise.all(
      round1Agents.map(a =>
        callGroq(buildConfidencePrompt(a.role, a.opinion, lang), 5)
      )
    )
    const confidences = confidenceResponses.map(r => {
      const n = parseInt(r.trim(), 10)
      return isNaN(n) ? 5 : Math.min(10, Math.max(0, n))
    })

    const agents: AgentResponse[] = round1Agents.map((a, i) => ({
      ...a,
      response: round2Responses[i],
      confidence: confidences[i],
    }))

    const verdict = await callGroq(buildSynthesizerPrompt(agents, safeBody.businessType, score, lang))

    return json({ agents, verdict })
  } catch {
    return json({ agents: [], verdict: '' }, 500)
  }
}
