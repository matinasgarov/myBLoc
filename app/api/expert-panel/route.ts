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
  selectedAgents?: string[]
}

function buildMarketAnalystPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  if (lang === 'en') {
    return `You are a Senior Market Analyst at a leading Azerbaijani business consultancy. Your client is considering opening a ${businessType}. Write in English only.

Data:
- Overall score: ${score}/95
- Direct competitors within 500m: ${ctx.competitors}
- Total businesses in area: ${ctx.totalBusinesses}
- Business type in OSM database: ${ctx.recognized ? 'yes' : 'no'}
- Dominant nearby competitors: ${ctx.dominantCompetitors.length > 0 ? ctx.dominantCompetitors.map(d => `${d.name} (${d.distance}m)`).join(', ') : 'none'}

Deliver 3–4 sentences of professional consultant-level analysis. Address market saturation, competitive positioning, and your expert recommendation on market entry viability. Speak directly to the business owner. Output only your analysis — no JSON, no labels.`
  }
  return `Sən aparıcı Azərbaycan biznes məsləhət şirkətinin Baş Bazar Analitikisən. Müştərin ${businessType} açmağı düşünür. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Məlumatlar:
- Ümumi bal: ${score}/95
- 500m-də birbaşa rəqiblər: ${ctx.competitors}
- Ərazidəki ümumi müəssisə: ${ctx.totalBusinesses}
- Biznes növü tanındı: ${ctx.recognized ? 'bəli' : 'xeyr'}
- Yaxın dominant rəqiblər: ${ctx.dominantCompetitors.length > 0 ? ctx.dominantCompetitors.map(d => `${d.name} (${d.distance}m)`).join(', ') : 'yoxdur'}

Peşəkar məsləhətçi səviyyəsindəki 3–4 cümlə yaz. Bazar doyumu, rəqabət mövqeyi və bazara giriş perspektivinə dair ekspert tövsiyəni əks etdir. Birbaşa biznes sahibinə müraciət et. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildRiskAdvisorPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, luxuryMismatch, rentTierAz, lang } = body
  const areaTypeEn = ctx.areaType === 'commercial' ? 'commercial' : ctx.areaType === 'mixed' ? 'mixed' : 'residential'
  const areaTypeAz = ctx.areaType === 'commercial' ? 'ticarət' : ctx.areaType === 'mixed' ? 'qarışıq' : 'yaşayış'
  if (lang === 'en') {
    return `You are a Senior Risk Advisor at a leading Azerbaijani business consultancy. Your client is considering opening a ${businessType}. Write in English only.

Data:
- Overall score: ${score}/95
- Land use restriction: ${ctx.landUse ?? 'none'}
- Area type: ${areaTypeEn}
- Rent tier: ${rentTierAz ?? 'unknown'}
- Luxury/wealth mismatch: ${luxuryMismatch ? 'yes — luxury business in low-wealth district' : 'no'}

Deliver 3–4 sentences of professional risk assessment. Identify primary risks, their severity, and provide a clear actionable recommendation. Speak directly to the business owner. Output only your analysis — no JSON, no labels.`
  }
  return `Sən aparıcı Azərbaycan biznes məsləhət şirkətinin Baş Risk Məsləhətçisisən. Müştərin ${businessType} açmağı düşünür. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Məlumatlar:
- Ümumi bal: ${score}/95
- Torpaq istifadə məhdudiyyəti: ${ctx.landUse ?? 'yoxdur'}
- Ərazi tipi: ${areaTypeAz}
- Kirayə səviyyəsi: ${rentTierAz ?? 'məlum deyil'}
- Lüks/gəlir uyğunsuzluğu: ${luxuryMismatch ? 'bəli — aşağı gəlirli rayonda lüks biznes' : 'xeyr'}

Peşəkar risk qiymətləndirməsinin 3–4 cümləsini yaz. Əsas riskləri, onların şiddətini müəyyən et və aydın əməli tövsiyə ver. Birbaşa biznes sahibinə müraciət et. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildLocationStrategistPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, districtPopulationK, lang } = body
  const urbanEn = ctx.urbanTier === 'metro-city' ? 'metro city (Baku/Sumgait)' : ctx.urbanTier === 'city' ? 'city' : ctx.urbanTier === 'town' ? 'town' : 'rural area'
  const urbanAz = ctx.urbanTier === 'metro-city' ? 'metro şəhəri (Bakı/Sumqayıt)' : ctx.urbanTier === 'city' ? 'şəhər' : ctx.urbanTier === 'town' ? 'qəsəbə' : 'kənd'
  if (lang === 'en') {
    return `You are a Senior Location Strategist at a leading Azerbaijani business consultancy. Your client is considering opening a ${businessType}. Write in English only.

Data:
- Overall score: ${score}/95
- Metro distance: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'no metro nearby'}
- Metro daily ridership: ${ctx.metroRidership !== null ? ctx.metroRidership.toLocaleString() : 'no data'}
- Major roads nearby: ${ctx.majorRoads}
- Urban tier: ${urbanEn}
- District population: ${districtPopulationK !== undefined ? `${Math.round(districtPopulationK * 1000).toLocaleString()} people` : 'unknown'}

Deliver 3–4 sentences of strategic location analysis. Assess access advantages, customer catchment potential, and long-term commercial viability. Speak directly to the business owner. Output only your analysis — no JSON, no labels.`
  }
  return `Sən aparıcı Azərbaycan biznes məsləhət şirkətinin Baş Məkan Strateqisən. Müştərin ${businessType} açmağı düşünür. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Məlumatlar:
- Ümumi bal: ${score}/95
- Metro məsafəsi: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'yaxında metro yoxdur'}
- Metro gündəlik sərnişin: ${ctx.metroRidership !== null ? ctx.metroRidership.toLocaleString() : 'məlumat yoxdur'}
- Yaxın böyük yollar: ${ctx.majorRoads}
- Şəhər tipi: ${urbanAz}
- Rayon əhalisi: ${districtPopulationK !== undefined ? `${Math.round(districtPopulationK * 1000).toLocaleString()} nəfər` : 'məlum deyil'}

Strateji məkan təhlilinin 3–4 cümləsini yaz. Əlçatanlıq üstünlüklərini, müştəri potensialını və uzunmüddətli kommersiya perspektivini qiymətləndir. Birbaşa biznes sahibinə müraciət et. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildCustomerFlowPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  if (lang === 'en') {
    return `You are a Senior Customer Flow Expert at a leading Azerbaijani business consultancy. Your client is considering opening a ${businessType}. Write in English only.

Data:
- Overall score: ${score}/95
- Bus stops within 500m: ${ctx.busStops}
- Parking available: ${ctx.parking > 0 ? `yes (${ctx.parking} spots)` : 'no'}
- Grocery stores within 500m: ${ctx.groceryStores}
- Nearby amenities: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'none'}

Deliver 3–4 sentences assessing daily foot traffic generation, customer convenience, and transport accessibility. Provide actionable advice on leveraging or mitigating these factors. Speak directly to the business owner. Output only your analysis — no JSON, no labels.`
  }
  return `Sən aparıcı Azərbaycan biznes məsləhət şirkətinin Baş Müştəri Axını Ekspertisən. Müştərin ${businessType} açmağı düşünür. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Məlumatlar:
- Ümumi bal: ${score}/95
- 500m-də avtobus dayanacağı: ${ctx.busStops}
- Parkinq: ${ctx.parking > 0 ? `var (${ctx.parking} yer)` : 'yoxdur'}
- 500m-də ərzaq mağazası: ${ctx.groceryStores}
- Yaxın obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'yoxdur'}

Gündəlik piyada trafik generasiyasını, müştəri rahatlığını və nəqliyyat əlçatanlığını qiymətləndirən 3–4 cümlə yaz. Bu amillərdən istifadə etmək və ya onları azaltmaq üçün əməli məsləhət ver. Birbaşa biznes sahibinə müraciət et. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildUrbanForecasterPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  const urbanEn = ctx.urbanTier === 'metro-city' ? 'metro city (Baku/Sumgait)' : ctx.urbanTier === 'city' ? 'city' : ctx.urbanTier === 'town' ? 'town' : 'rural area'
  const urbanAz = ctx.urbanTier === 'metro-city' ? 'metro şəhəri (Bakı/Sumqayıt)' : ctx.urbanTier === 'city' ? 'şəhər' : ctx.urbanTier === 'town' ? 'qəsəbə' : 'kənd'
  const areaEn = ctx.areaType === 'commercial' ? 'commercial' : ctx.areaType === 'mixed' ? 'mixed-use' : 'residential'
  const areaAz = ctx.areaType === 'commercial' ? 'ticarət' : ctx.areaType === 'mixed' ? 'qarışıq' : 'yaşayış'
  if (lang === 'en') {
    return `You are a Senior Urban Development Forecaster at a leading Azerbaijani business consultancy. Your client is considering opening a ${businessType}. Write in English only.

Data:
- Overall score: ${score}/95
- Urban tier: ${urbanEn}
- Current area type: ${areaEn}
- Land use restriction: ${ctx.landUse ?? 'none'}
- Business density: ${ctx.totalBusinesses} businesses in the area

Deliver 3–4 sentences projecting urban development trends for this location. Assess zoning trajectory, likely infrastructure investment patterns, and how urban growth may enhance or threaten the business's long-term position. Provide forward-looking strategic advice. Speak directly to the business owner. Output only your analysis — no JSON, no labels.`
  }
  return `Sən aparıcı Azərbaycan biznes məsləhət şirkətinin Baş Şəhər İnkişafı Proqnozçususan. Müştərin ${businessType} açmağı düşünür. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Məlumatlar:
- Ümumi bal: ${score}/95
- Şəhər tipi: ${urbanAz}
- Cari ərazi tipi: ${areaAz}
- Torpaq istifadə məhdudiyyəti: ${ctx.landUse ?? 'yoxdur'}
- Müəssisə sıxlığı: ərazidə ${ctx.totalBusinesses} müəssisə

Bu məkan üçün şəhər inkişafı tendensiyalarını proqnozlaşdıran 3–4 cümlə yaz. Zonalanma yolunu, infrastruktur investisiya modellərini və şəhər böyüməsinin biznesin uzunmüddətli mövqeyinə təsirini qiymətləndir. Gələcəyə yönəlmiş strateji məsləhət ver. Birbaşa biznes sahibinə müraciət et. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
}

function buildInfrastructureAuditorPrompt(body: RequestBody): string {
  const { businessType, score, placesContext: ctx, lang } = body
  if (lang === 'en') {
    return `You are a Senior Infrastructure & Utility Auditor at a leading Azerbaijani business consultancy. Your client is considering opening a ${businessType}. Write in English only.

Data:
- Overall score: ${score}/95
- Bus stops within 500m: ${ctx.busStops}
- Parking spots nearby: ${ctx.parking}
- Metro distance: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'no metro nearby'}
- Major roads nearby: ${ctx.majorRoads}
- Nearby amenities: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'none'}

Deliver 3–4 sentences auditing infrastructure quality and utility coverage. Assess transport network completeness, parking adequacy, and supporting service infrastructure. Identify any infrastructure gaps that could impact daily operations or customer experience. Speak directly to the business owner. Output only your analysis — no JSON, no labels.`
  }
  return `Sən aparıcı Azərbaycan biznes məsləhət şirkətinin Baş İnfrastruktur Auditorusan. Müştərin ${businessType} açmağı düşünür. Yalnız Azərbaycan dilində (latın əlifbası) yaz.

Məlumatlar:
- Ümumi bal: ${score}/95
- 500m-də avtobus dayanacağı: ${ctx.busStops}
- Yaxın parkinq yerləri: ${ctx.parking}
- Metro məsafəsi: ${ctx.metroDistance !== null ? `${ctx.metroDistance}m` : 'yaxında metro yoxdur'}
- Yaxın böyük yollar: ${ctx.majorRoads}
- Yaxın obyektlər: ${ctx.amenities.length > 0 ? ctx.amenities.join(', ') : 'yoxdur'}

İnfrastruktur keyfiyyəti və kommunal əhatənin auditini əks etdirən 3–4 cümlə yaz. Nəqliyyat şəbəkəsinin tamlığını, parkinqin adekvatlığını və dəstəkləyici xidmət infrastrukturunu qiymətləndir. Gündəlik əməliyyatlara və ya müştəri təcrübəsinə təsir edə biləcək boşluqları müəyyən et. Birbaşa biznes sahibinə müraciət et. Yalnız təhlil mətni yaz, JSON yox, etiket yox.`
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

export function parseConfidence(raw: string): number {
  const n = parseInt(raw.trim(), 10)
  return isNaN(n) ? 5 : Math.min(10, Math.max(0, n))
}

export function buildConfidencePrompt(role: string, opinion: string, lang: 'az' | 'en'): string {
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
  if (await isRateLimited(rateKey, 12, 60_000, 'expert-min'))
    return json({ error: 'Too many requests' }, 429)
  if (await isRateLimitedDaily(ip, 40, 'expert-day'))
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
    const allAgentDefs: { key: string; role: string; emoji: string; prompt: string }[] = [
      { key: 'market-analyst',         role: lang === 'en' ? 'Market Analyst' : 'Bazar Analitiki',                            emoji: '📊', prompt: buildMarketAnalystPrompt(safeBody) },
      { key: 'risk-advisor',           role: lang === 'en' ? 'Risk Advisor' : 'Risk Məsləhətçisi',                            emoji: '⚠️', prompt: buildRiskAdvisorPrompt(safeBody) },
      { key: 'location-strategist',    role: lang === 'en' ? 'Location Strategist' : 'Məkan Strateqi',                       emoji: '🗺️', prompt: buildLocationStrategistPrompt(safeBody) },
      { key: 'customer-flow',          role: lang === 'en' ? 'Customer Flow Expert' : 'Müştəri Axını Eksperti',              emoji: '🚶', prompt: buildCustomerFlowPrompt(safeBody) },
      { key: 'urban-forecaster',       role: lang === 'en' ? 'Urban Development Forecaster' : 'Şəhər İnkişafı Proqnozçusu', emoji: '🏙️', prompt: buildUrbanForecasterPrompt(safeBody) },
      { key: 'infrastructure-auditor', role: lang === 'en' ? 'Infrastructure & Utility Auditor' : 'İnfrastruktur Auditor',   emoji: '🔧', prompt: buildInfrastructureAuditorPrompt(safeBody) },
    ]

    const selectedKeys = Array.isArray(body.selectedAgents) && body.selectedAgents.length > 0
      ? body.selectedAgents
      : allAgentDefs.map(a => a.key)
    const agentDefs = allAgentDefs.filter(a => selectedKeys.includes(a.key))

    // Single-agent fast path — skip round 2 and synthesizer
    if (agentDefs.length === 1) {
      const [def] = agentDefs
      const opinion = await callGroq(def.prompt)
      const confidenceRaw = await callGroq(buildConfidencePrompt(def.role, opinion, lang), 5)
      return json({
        agents: [{ role: def.role, emoji: def.emoji, opinion, response: '', confidence: parseConfidence(confidenceRaw) }],
        verdict: '',
      })
    }

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
    const confidences = confidenceResponses.map(parseConfidence)

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
