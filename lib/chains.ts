export interface ChainDefinition {
  keywords: string[]
  nameVariants: string[]
  osmCategories: string[]
}

export function normalizeChainName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesChain(rawName: string, chain: ChainDefinition): boolean {
  const normalized = normalizeChainName(rawName)
  const allTerms = [...chain.keywords, ...chain.nameVariants].map(normalizeChainName)
  return allTerms.some((term) => normalized.includes(term))
}

/** Known dominant retail chains in Azerbaijan. */
export const BAKU_CHAINS: ChainDefinition[] = [
  // ── GROCERY & SUPERMARKETS ──────────────────────────────────────────────
  {
    keywords: ['bravo'],
    nameVariants: ['bravo supermarket', 'bravo market', 'брavo', 'брavo маркет'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['tamstore'],
    nameVariants: ['tam store', 'tam mağaza', 'тамстор'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['bazarstore'],
    nameVariants: ['bazar store', 'bazar mağaza', 'базармаркет'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['araz market', 'araz supermarket'],
    nameVariants: ['araz mağaza', 'аraз маркет', 'araz magazin', 'азрейл'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['bolmart'],
    nameVariants: ['bol mart', 'bol market', 'bolmarket'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['makro'],
    nameVariants: ['macro market', 'makro market', 'макро'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['ulduz'],
    nameVariants: ['ulduz market', 'ulduz mağaza', 'улдуз'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['spar'],
    nameVariants: ['spar supermarket', 'spar market', 'спар'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['oba market'],
    nameVariants: ['oba mağaza', 'oba supermarket', 'оба маркет'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['al market'],
    nameVariants: ['al mağaza', 'al supermarket', 'ал маркет'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['grandmart'],
    nameVariants: ['grand mart', 'grand market', 'грандмарт'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['neptun'],
    nameVariants: ['neptun market', 'нептун маркет', 'нептун магазин'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['bakumart'],
    nameVariants: ['baku mart', 'baku market', 'баку март'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['carrefour'],
    nameVariants: ['carrefour express', 'карефур', 'каррефур'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  {
    keywords: ['mybostan'],
    nameVariants: ['my bostan', 'mybоstan', 'май бостан'],
    osmCategories: ['supermarket', 'convenience', 'grocery', 'mall', 'general'],
  },
  // ── ELECTRONICS ─────────────────────────────────────────────────────────
  {
    keywords: ['kontakt'],
    nameVariants: ['kontakt home', 'kontakt electronics', 'контакт'],
    osmCategories: ['electronics', 'computer', 'mobile_phone'],
  },
  {
    keywords: ['teknosa'],
    nameVariants: ['tekno sa', 'teknosa electronics', 'текноса'],
    osmCategories: ['electronics', 'computer', 'mobile_phone'],
  },
  {
    keywords: ['irshad electronics', 'irsad electronics'],
    nameVariants: ['irşad', 'irshad', 'иршад электроникс'],
    osmCategories: ['electronics', 'computer', 'mobile_phone'],
  },
  {
    keywords: ['ultra'],
    nameVariants: ['ultra electronics', 'ultra store', 'ултра'],
    osmCategories: ['electronics', 'computer', 'mobile_phone'],
  },
  // ── PHARMACIES ──────────────────────────────────────────────────────────
  {
    keywords: ['sağlam', 'saglam'],
    nameVariants: ['sağlam aptek', 'saglam apteka', 'sağlam əczaçılıq', 'саглам аптека'],
    osmCategories: ['pharmacy', 'chemist'],
  },
  {
    keywords: ['şəfa aptek', 'sefa aptek'],
    nameVariants: ['şəfa apteka', 'shefa aptek', 'шэфа аптека'],
    osmCategories: ['pharmacy', 'chemist'],
  },
  {
    keywords: ['lider aptek'],
    nameVariants: ['lider eczane', 'lider apteka', 'лидер аптека'],
    osmCategories: ['pharmacy', 'chemist'],
  },
  {
    keywords: ['alim aptek'],
    nameVariants: ['əlim aptek', 'alim apteka', 'əlim apteka'],
    osmCategories: ['pharmacy', 'chemist'],
  },
  // ── FUEL STATIONS ───────────────────────────────────────────────────────
  {
    keywords: ['socar'],
    nameVariants: ['socar petroleum', 'socar yanacaq', 'сокар', 'азпетрол socar'],
    osmCategories: ['fuel', 'gas_station'],
  },
  {
    keywords: ['bp'],
    nameVariants: ['bp azerbaijan', 'british petroleum', 'bp yanacaq', 'бп'],
    osmCategories: ['fuel', 'gas_station'],
  },
  {
    keywords: ['azpetrol'],
    nameVariants: ['az petrol', 'азпетрол'],
    osmCategories: ['fuel', 'gas_station'],
  },
  {
    keywords: ['lukoil'],
    nameVariants: ['лукойл', 'lukoil azerbaijan'],
    osmCategories: ['fuel', 'gas_station'],
  },
  // ── TELECOM ─────────────────────────────────────────────────────────────
  {
    keywords: ['azercell'],
    nameVariants: ['azercell telekom', 'azercell mərkəzi', 'азерселл'],
    osmCategories: ['mobile_phone', 'telecommunication'],
  },
  {
    keywords: ['bakcell'],
    nameVariants: ['bakcell mərkəzi', 'bakcell center', 'бакселл'],
    osmCategories: ['mobile_phone', 'telecommunication'],
  },
  {
    keywords: ['nar mobile', 'nar mərkəzi'],
    nameVariants: ['nar', 'azerfon', 'нар мобайл', 'нар мəркəзи'],
    osmCategories: ['mobile_phone', 'telecommunication'],
  },
  // ── BANKS ───────────────────────────────────────────────────────────────
  {
    keywords: ['kapital bank', 'kapitalbank'],
    nameVariants: ['kapital bankı', 'капитал банк', 'kapital'],
    osmCategories: ['bank', 'atm'],
  },
  {
    keywords: ['abb'],
    nameVariants: ['international bank of azerbaijan', 'beynəlxalq bank', 'азербайджан беynalxalq bankı', 'abb bank'],
    osmCategories: ['bank', 'atm'],
  },
  {
    keywords: ['pasha bank', 'paşa bank'],
    nameVariants: ['pasha holding bank', 'paşa bankı', 'паша банк'],
    osmCategories: ['bank', 'atm'],
  },
  {
    keywords: ['xalq bank', 'xalqbank'],
    nameVariants: ['xalq bankı', 'халг банк', 'xalq bank filiali'],
    osmCategories: ['bank', 'atm'],
  },
  {
    keywords: ['bank respublika'],
    nameVariants: ['bankrespublika', 'respublika bank', 'банк республика'],
    osmCategories: ['bank', 'atm'],
  },
  {
    keywords: ['accessbank'],
    nameVariants: ['access bank', 'акcessbank', 'аксессбанк'],
    osmCategories: ['bank', 'atm'],
  },
  {
    keywords: ['rabitabank', 'rabitəbank'],
    nameVariants: ['rabitə bank', 'рабитабанк'],
    osmCategories: ['bank', 'atm'],
  },
  {
    keywords: ['atb bank', 'azer turk bank'],
    nameVariants: ['azər türk bank', 'azerbaijani turkish bank', 'азер тюрк банк'],
    osmCategories: ['bank', 'atm'],
  },
  // ── FAST FOOD ───────────────────────────────────────────────────────────
  {
    keywords: ["mcdonald's", 'mcdonalds'],
    nameVariants: ['макдоналдс', 'mак donald', 'mcdonald'],
    osmCategories: ['fast_food', 'restaurant'],
  },
  {
    keywords: ['kfc'],
    nameVariants: ['kentucky fried chicken', 'кфс', 'k.f.c'],
    osmCategories: ['fast_food', 'restaurant'],
  },
  {
    keywords: ['burger king'],
    nameVariants: ['burgerking', 'бургер кинг'],
    osmCategories: ['fast_food', 'restaurant'],
  },
  {
    keywords: ["domino's", 'dominos'],
    nameVariants: ['dominos pizza', "domino's pizza", 'доминос'],
    osmCategories: ['fast_food', 'restaurant'],
  },
  {
    keywords: ['subway'],
    nameVariants: ['subway restaurant', 'сабвей'],
    osmCategories: ['fast_food', 'restaurant'],
  },
  {
    keywords: ["hardee's", 'hardees'],
    nameVariants: ['хардис', 'hardies'],
    osmCategories: ['fast_food', 'restaurant'],
  },
  // ── CAFES & COFFEE ──────────────────────────────────────────────────────
  {
    keywords: ['gloria jeans', "gloria jean's coffees"],
    nameVariants: ['gloria jean coffees', 'глория джинс', 'gloria jeans coffee'],
    osmCategories: ['cafe', 'coffee_shop'],
  },
  {
    keywords: ['coffeemania'],
    nameVariants: ['coffee mania', 'кофемания'],
    osmCategories: ['cafe', 'coffee_shop'],
  },
  {
    keywords: ['paul'],
    nameVariants: ['paul bakery', 'paul café', 'paul cafe', 'поль'],
    osmCategories: ['cafe', 'coffee_shop', 'bakery'],
  },
  // ── FASHION ─────────────────────────────────────────────────────────────
  {
    keywords: ['zara'],
    nameVariants: ['зара', 'zara store', 'zara kids'],
    osmCategories: ['clothes', 'fashion', 'department_store'],
  },
  {
    keywords: ['mango'],
    nameVariants: ['mango store', 'манго', 'mango fashion'],
    osmCategories: ['clothes', 'fashion'],
  },
  {
    keywords: ['bershka'],
    nameVariants: ['бершка', 'bershka store'],
    osmCategories: ['clothes', 'fashion'],
  },
  {
    keywords: ['lcwaikiki', 'lc waikiki'],
    nameVariants: ['lc vaikiki', 'el si vaikiki', 'лц вайкики', 'lcw'],
    osmCategories: ['clothes', 'fashion'],
  },
  {
    keywords: ["colin's", 'colins'],
    nameVariants: ['colin', 'колинс', 'kolins'],
    osmCategories: ['clothes', 'fashion'],
  },
  {
    keywords: ['new yorker'],
    nameVariants: ['newyorker', 'нью йоркер'],
    osmCategories: ['clothes', 'fashion'],
  },
  {
    keywords: ['adidas'],
    nameVariants: ['adidas store', 'adidas originals', 'адидас'],
    osmCategories: ['clothes', 'sports', 'shoes'],
  },
  {
    keywords: ['nike'],
    nameVariants: ['nike store', 'найк'],
    osmCategories: ['clothes', 'sports', 'shoes'],
  },
  // ── MALLS ───────────────────────────────────────────────────────────────
  {
    keywords: ['ganjlik mall', 'gənclik mall'],
    nameVariants: ['genclik mall', 'ganjlik', 'гянджлик молл'],
    osmCategories: ['mall', 'shopping_centre'],
  },
  {
    keywords: ['park bulvar', 'park boulevard'],
    nameVariants: ['parkbulvar', 'park bulvar mall', 'парк булвар'],
    osmCategories: ['mall', 'shopping_centre'],
  },
  {
    keywords: ['port baku mall', 'port baku'],
    nameVariants: ['port baku center', 'порт баку молл'],
    osmCategories: ['mall', 'shopping_centre'],
  },
  {
    keywords: ['28 mall'],
    nameVariants: ['28mall', 'iyirmi səkkiz mall', '28 may mall'],
    osmCategories: ['mall', 'shopping_centre'],
  },
  {
    keywords: ['deniz mall'],
    nameVariants: ['dəniz mall', 'denizmall', 'дениз молл'],
    osmCategories: ['mall', 'shopping_centre'],
  },
  {
    keywords: ['nargiz mall'],
    nameVariants: ['nərgiz mall', 'nargizmall', 'наргиз молл'],
    osmCategories: ['mall', 'shopping_centre'],
  },
]
