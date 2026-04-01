import { AZ_PLACES } from './az-places-compact'

const RADIUS_KM = 0.5

// Maps user input keywords → AZ dataset TYPE values
const BUSINESS_TO_AZ_TYPES: Array<[string[], string[]]> = [
  [['restoran', 'restaurant', 'yemək'], ['RESTAURANT', 'RESTAURANT_CAFES', 'RESTAURANT_FAST_FOOD', 'RESTAURANT_TEA']],
  [['kafe', 'cafe', 'kofe', 'qəhvə', 'çay evi', 'çayxana'], ['RESTAURANT_CAFES', 'RESTAURANT_TEA', 'RESTAURANT']],
  [['fast food', 'fastfood', 'burger', 'pizza'], ['RESTAURANT_FAST_FOOD', 'RESTAURANT']],
  [['apteka', 'eczane', 'dərman', 'pharmacy'], ['PHARMACY']],
  [['bank', 'maliyyə', 'kredit'], ['BANK']],
  [['supermarket', 'market', 'ərzaq'], ['GROCERY_STORE', 'SHOPPING_CENTER']],
  [['geyim', 'paltar', 'butik', 'moda', 'mağaza'], ['CLOTHING_RETAIL', 'DEPARTMENT_STORE', 'SPECIALTY_RETAIL']],
  [['fitnes', 'idman', 'gym', 'fitness', 'zal'], ['FITNESS_CENTER']],
  [['salon', 'gözəllik', 'beauty', 'saç', 'bərbər', 'barber'], ['SERVICES_PERSONAL']],
  [['otel', 'hotel', 'hostel', 'qonaqevi'], ['HOTEL']],
  [['yanacaq', 'benzin', 'fuel', 'neft', 'gas station'], ['GAS_STATION']],
  [['klinika', 'həkim', 'xəstəxana', 'tibb'], ['HOSPITAL']],
  [['diş', 'stomatolog', 'dentist'], ['HOSPITAL']],
  [['uşaq', 'bağça', 'körpə', 'kindergarten'], ['KINDERGARTEN']],
  [['bar', 'pub', 'şərab', 'spirtli'], ['BAR', 'WINERY']],
  [['mebel', 'ev əşyaları', 'ev üçün'], ['HOME_FURNISHINGS_STORE']],
  [['alış-veriş', 'ticarət mərkəzi', 'mall'], ['SHOPPING_CENTER', 'DEPARTMENT_STORE']],
  [['avto', 'avtomobil', 'maşın', 'servis'], ['AUTO_REPAIR']],
  [['kitab', 'kitabxana'], ['LIBRARY']],
  [['muzey', 'museum'], ['MUSEUM']],
  [['park', 'istirahət'], ['PARK']],
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function resolveAzTypes(businessType: string): string[] | null {
  const lower = businessType.toLowerCase()
  for (const [keywords, types] of BUSINESS_TO_AZ_TYPES) {
    if (keywords.some((k) => lower.includes(k))) return types
  }
  return null
}

export function countAzCompetitors(lat: number, lng: number, businessType: string): number {
  const azTypes = resolveAzTypes(businessType)
  if (!azTypes) return -1 // -1 = no mapping found, caller should fall back to OSM

  const typeSet = new Set(azTypes)
  return AZ_PLACES.filter(
    ([pLat, pLng, pType]) =>
      typeSet.has(pType) && haversineKm(lat, lng, pLat, pLng) <= RADIUS_KM
  ).length
}
