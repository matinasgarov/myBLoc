export interface BusinessCategory {
  /** Sent to the API as businessType — must match a keyword in COMPETITOR_ALIASES */
  key: string
  labelAz: string
  labelEn: string
  /** Additional terms searched when user types in the modal */
  synonyms: string[]
  /** Shown in collapsed state (first 3 pinned only) */
  pinned?: boolean
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // ── Food & Beverage ──────────────────────────────────────────────────────
  {
    key: 'restoran',
    labelAz: 'Restoran',
    labelEn: 'Restaurant',
    synonyms: ['restoran', 'yemək', 'xörək', 'nahar', 'food', 'eating'],
    pinned: true,
  },
  {
    key: 'kafe',
    labelAz: 'Kafe / Kofe',
    labelEn: 'Café / Coffee',
    synonyms: ['kafe', 'kofe', 'qəhvə', 'coffee', 'kahve'],
  },
  {
    key: 'fast food',
    labelAz: 'Fast Food',
    labelEn: 'Fast Food',
    synonyms: ['fast food', 'fastfood', 'burger', 'snack'],
  },
  {
    key: 'pizza',
    labelAz: 'Pizza',
    labelEn: 'Pizza',
    synonyms: ['pizza', 'lahmacun'],
  },
  {
    key: 'qəhvəxana',
    labelAz: 'Çayxana',
    labelEn: 'Teahouse',
    synonyms: ['çayxana', 'çay', 'qəhvəxana', 'tea', 'teahouse'],
  },
  {
    key: 'çörək',
    labelAz: 'Çörəkçi / Şirniyyat',
    labelEn: 'Bakery / Sweets',
    synonyms: ['çörək', 'şirniyyat', 'tort', 'cake', 'konfet', 'bakery', 'pastry'],
  },

  // ── Retail ───────────────────────────────────────────────────────────────
  {
    key: 'supermarket',
    labelAz: 'Market / Ərzaq',
    labelEn: 'Market / Grocery',
    synonyms: ['market', 'bazar', 'ərzaq', 'bakkal', 'mağaza', 'supermarket', 'grocery'],
    pinned: true,
  },
  {
    key: 'geyim',
    labelAz: 'Geyim / Paltar',
    labelEn: 'Clothing / Fashion',
    synonyms: ['geyim', 'paltar', 'fashion', 'clothes', 'boutique', 'butik'],
  },
  {
    key: 'elektronika',
    labelAz: 'Elektronika / Komputer',
    labelEn: 'Electronics / Tech',
    synonyms: ['komputer', 'telefon', 'laptop', 'mobil', 'texnika', 'gadget', 'tech', 'electronics'],
  },
  {
    key: 'kitab',
    labelAz: 'Kitab / Kağız',
    labelEn: 'Books / Stationery',
    synonyms: ['kitab', 'dəftər', 'kağız', 'book', 'stationery', 'kitabxana'],
  },
  {
    key: 'çiçək',
    labelAz: 'Çiçək Mağazası',
    labelEn: 'Flower Shop',
    synonyms: ['çiçək', 'gül', 'flower', 'florist'],
  },
  {
    key: 'mebel',
    labelAz: 'Ev Əşyası / Mebel',
    labelEn: 'Furniture / Decor',
    synonyms: ['mebel', 'ev əşyası', 'furniture', 'dekor', 'interior'],
  },

  // ── Health & Beauty ───────────────────────────────────────────────────────
  {
    key: 'aptek',
    labelAz: 'Aptek',
    labelEn: 'Pharmacy',
    synonyms: ['aptek', 'apteka', 'dərman', 'pharmacy', 'əczaçılıq'],
    pinned: true,
  },
  {
    key: 'salon',
    labelAz: 'Gözəllik Salonu',
    labelEn: 'Beauty Salon',
    synonyms: ['salon', 'gözəllik', 'beauty', 'kosmetik', 'spa'],
  },
  {
    key: 'bərbər',
    labelAz: 'Bərbər',
    labelEn: 'Barber',
    synonyms: ['bərbər', 'barber', 'saç', 'həllaqlıq'],
  },
  {
    key: 'fitnes',
    labelAz: 'Fitnes / İdman Zalı',
    labelEn: 'Gym / Fitness',
    synonyms: ['fitnes', 'fitness', 'idman', 'gym', 'zal', 'crossfit', 'sport'],
  },
  {
    key: 'stomatolog',
    labelAz: 'Diş Həkimi',
    labelEn: 'Dentist',
    synonyms: ['stomatolog', 'diş', 'dentist'],
  },
  {
    key: 'klinika',
    labelAz: 'Klinika / Tibb',
    labelEn: 'Clinic / Medical',
    synonyms: ['klinika', 'tibb', 'həkim', 'hospital', 'xəstəxana', 'poliklinika', 'doctor'],
  },

  // ── Services & Hospitality ────────────────────────────────────────────────
  {
    key: 'bank',
    labelAz: 'Bank / ATM',
    labelEn: 'Bank / ATM',
    synonyms: ['bank', 'atm', 'maliyyə', 'kredit', 'finance'],
  },
  {
    key: 'otel',
    labelAz: 'Otel / Hostel',
    labelEn: 'Hotel / Hostel',
    synonyms: ['otel', 'hotel', 'hostel', 'qonaq', 'motel', 'apart'],
  },
  {
    key: 'yanacaq',
    labelAz: 'Yanacaq Stansiyası',
    labelEn: 'Fuel Station',
    synonyms: ['yanacaq', 'benzin', 'fuel', 'neft', 'doldurma'],
  },
  {
    key: 'avtomobil',
    labelAz: 'Avto Servis',
    labelEn: 'Car Service',
    synonyms: ['avtomobil', 'maşın', 'avto', 'car', 'servis', 'ehtiyat hissə'],
  },

  // ── Entertainment & Education ─────────────────────────────────────────────
  {
    key: 'oyun',
    labelAz: 'Oyun Klubu',
    labelEn: 'Game Club',
    synonyms: ['oyun', 'gaming', 'klub', 'bilyard', 'billiard', 'game'],
  },
  {
    key: 'bar',
    labelAz: 'Bar / Pub',
    labelEn: 'Bar / Pub',
    synonyms: ['bar', 'pub', 'içki', 'alkoqol', 'nightclub'],
  },
  {
    key: 'uşaq',
    labelAz: 'Uşaq Bağçası',
    labelEn: 'Kindergarten',
    synonyms: ['uşaq', 'körpə', 'bağça', 'kindergarten', 'dayə'],
  },
  {
    key: 'məktəb',
    labelAz: 'Təhsil / Kurs',
    labelEn: 'Education / Courses',
    synonyms: ['məktəb', 'təhsil', 'kurs', 'dərs', 'universitet', 'school', 'course', 'tədris'],
  },
  {
    key: 'tikinti',
    labelAz: 'Tikinti / Materiallar',
    labelEn: 'Construction / Materials',
    synonyms: ['tikinti', 'material', 'inşaat', 'building', 'hardware', 'təmir'],
  },
]
