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

  // ── Retail (extended) ────────────────────────────────────────────────────
  {
    key: 'kosmetika',
    labelAz: 'Kosmetika / Parfüm',
    labelEn: 'Cosmetics / Perfume',
    synonyms: ['kosmetika', 'parfüm', 'parfümeri', 'bəzək', 'makeup', 'perfume', 'cosmetics'],
  },
  {
    key: 'idman malları',
    labelAz: 'İdman Malları',
    labelEn: 'Sports Goods',
    synonyms: ['idman malları', 'sport', 'velosiped', 'bike', 'avadanlıq', 'equipment', 'sports goods'],
  },
  {
    key: 'zərgərlik',
    labelAz: 'Zərgərlik / Aksesuar',
    labelEn: 'Jewelry / Accessories',
    synonyms: ['zərgərlik', 'qızıl', 'gümüş', 'jewelry', 'aksesuar', 'saat', 'watch', 'jewellery'],
  },
  {
    key: 'topdan',
    labelAz: 'Topdan Satış',
    labelEn: 'Wholesale',
    synonyms: ['topdan', 'wholesale', 'anbar', 'warehouse', 'distribütor', 'bulk'],
  },

  // ── Health (extended) ────────────────────────────────────────────────────
  {
    key: 'optika',
    labelAz: 'Optika / Gözlük',
    labelEn: 'Optician',
    synonyms: ['optika', 'gözlük', 'linza', 'optician', 'glasses', 'lens', 'eye'],
  },
  {
    key: 'masaj',
    labelAz: 'Masaj / SPA',
    labelEn: 'Massage / SPA',
    synonyms: ['masaj', 'spa', 'massage', 'relax', 'wellness', 'body care'],
  },
  {
    key: 'baytarlıq',
    labelAz: 'Baytarlıq / Heyvan Klinikası',
    labelEn: 'Veterinary',
    synonyms: ['baytarlıq', 'heyvan', 'it', 'pişik', 'vet', 'veterinary', 'pet clinic'],
  },

  // ── Services & Hospitality (extended) ────────────────────────────────────
  {
    key: 'avtomobil satış',
    labelAz: 'Avtomobil Satışı',
    labelEn: 'Car Dealership',
    synonyms: ['avtomobil satış', 'maşın satışı', 'car dealer', 'ikinci əl', 'used car', 'salon avto'],
  },
  {
    key: 'hüquq',
    labelAz: 'Hüquq / Notariat',
    labelEn: 'Legal / Notary',
    synonyms: ['hüquq', 'vəkil', 'notariat', 'notary', 'lawyer', 'legal', 'məhkəmə'],
  },
  {
    key: 'mühasibat',
    labelAz: 'Mühasibat / Vergi',
    labelEn: 'Accounting / Tax',
    synonyms: ['mühasibat', 'vergi', 'accounting', 'tax', 'audit', 'maliyyə xidməti'],
  },
  {
    key: 'sığorta',
    labelAz: 'Sığorta',
    labelEn: 'Insurance',
    synonyms: ['sığorta', 'insurance', 'icbari', 'könüllü', 'OSAGO', 'life insurance'],
  },
  {
    key: 'əmlak',
    labelAz: 'Əmlak / Daşınmaz Mülk',
    labelEn: 'Real Estate',
    synonyms: ['əmlak', 'mənzil', 'ev', 'real estate', 'icarə', 'kiraye', 'rent', 'property'],
  },
  {
    key: 'təmizlik',
    labelAz: 'Təmizlik Xidməti',
    labelEn: 'Cleaning Service',
    synonyms: ['təmizlik', 'cleaning', 'yuma', 'ev təmizliyi', 'housekeeping', 'laundry', 'camaşır'],
  },
  {
    key: 'çatdırılma',
    labelAz: 'Kuryer / Çatdırılma',
    labelEn: 'Courier / Delivery',
    synonyms: ['kuryer', 'çatdırılma', 'delivery', 'courier', 'göndəriş', 'kargo'],
  },
  {
    key: 'foto',
    labelAz: 'Foto / Video',
    labelEn: 'Photo / Video',
    synonyms: ['foto', 'video', 'photographer', 'fotoqraf', 'studio', 'çəkiliş', 'fotostudia'],
  },
  {
    key: 'reklam',
    labelAz: 'Reklam / Dizayn',
    labelEn: 'Advertising / Design',
    synonyms: ['reklam', 'dizayn', 'marketing', 'brend', 'advertising', 'media', 'PR'],
  },
  {
    key: 'it xidmət',
    labelAz: 'IT Xidmət / Proqramlaşdırma',
    labelEn: 'IT Services / Dev',
    synonyms: ['it', 'proqram', 'sayt', 'website', 'software', 'tech support', 'developer', 'it xidmət'],
  },

  // ── Transport & Logistics ─────────────────────────────────────────────────
  {
    key: 'taksi',
    labelAz: 'Taksi / Minik',
    labelEn: 'Taxi / Ride',
    synonyms: ['taksi', 'taxi', 'minik', 'ride', 'transfer', 'uber'],
  },
  {
    key: 'yük daşıma',
    labelAz: 'Yük Daşıma / Köç',
    labelEn: 'Freight / Moving',
    synonyms: ['yük', 'daşıma', 'köç', 'freight', 'moving', 'kargo', 'logistika'],
  },
  {
    key: 'anbar',
    labelAz: 'Anbar / Saxlama',
    labelEn: 'Warehouse / Storage',
    synonyms: ['anbar', 'saxlama', 'warehouse', 'storage', 'depo'],
  },
  {
    key: 'turizm',
    labelAz: 'Turizm / Səyahət',
    labelEn: 'Tourism / Travel',
    synonyms: ['turizm', 'səyahət', 'tour', 'travel', 'bilet', 'ticket', 'agent', 'excursion'],
  },

  // ── Agriculture & Farming ─────────────────────────────────────────────────
  {
    key: 'kənd təsərrüfatı',
    labelAz: 'Kənd Təsərrüfatı',
    labelEn: 'Agriculture / Farming',
    synonyms: ['kənd', 'ferma', 'farm', 'agriculture', 'torpaq', 'bitki', 'məhsul', 'kənd təsərrüfatı'],
  },
  {
    key: 'heyvandarlıq',
    labelAz: 'Heyvandarlıq',
    labelEn: 'Livestock',
    synonyms: ['heyvandarlıq', 'mal-qara', 'livestock', 'quşçuluq', 'süd', 'dairy'],
  },
  {
    key: 'balıqçılıq',
    labelAz: 'Balıqçılıq / Akvakultura',
    labelEn: 'Fishing / Aquaculture',
    synonyms: ['balıq', 'fishing', 'akvakultura', 'dəniz məhsulları', 'seafood', 'balıqçılıq'],
  },
  {
    key: 'bağçılıq',
    labelAz: 'Bağçılıq / Bitki Satışı',
    labelEn: 'Gardening / Plants',
    synonyms: ['bağçılıq', 'bitki', 'toxum', 'gardening', 'plant', 'nursery', 'greenhouse', 'çiçəkçilik'],
  },
  {
    key: 'kənd malları',
    labelAz: 'Kənd Məhsulları Satışı',
    labelEn: 'Farm Produce Sales',
    synonyms: ['kənd malları', 'tərəvəz', 'meyvə', 'organic', 'üzvi', 'produce', 'fermer bazarı'],
  },

  // ── Professional Services ─────────────────────────────────────────────────
  {
    key: 'mühəndislik',
    labelAz: 'Mühəndislik / Layihə',
    labelEn: 'Engineering / Projects',
    synonyms: ['mühəndislik', 'engineering', 'layihə', 'texniki', 'konstruksiya'],
  },
  {
    key: 'tədris mərkəzi',
    labelAz: 'Tədris / Kurs Mərkəzi',
    labelEn: 'Training / Course Center',
    synonyms: ['tədris', 'kurs mərkəzi', 'training', 'dil mərkəzi', 'language school', 'repetitor', 'hazırlıq'],
  },
  {
    key: 'arxitektura',
    labelAz: 'Arxitektura / İnteryer Dizayn',
    labelEn: 'Architecture / Interior Design',
    synonyms: ['arxitektura', 'interior', 'dizayn', 'architect', 'layihəçi', 'design studio'],
  },
  {
    key: 'tərcümə',
    labelAz: 'Tərcümə Xidməti',
    labelEn: 'Translation Service',
    synonyms: ['tərcümə', 'translation', 'interpreter', 'dil', 'language service', 'tercüman'],
  },
  {
    key: 'çap',
    labelAz: 'Çap / Poliqrafiya',
    labelEn: 'Print / Reprographics',
    synonyms: ['çap', 'printing', 'poliqrafiya', 'banner', 'afişa', 'baskı', 'copyshop'],
  },

  // ── Entertainment (extended) ─────────────────────────────────────────────
  {
    key: 'kinoteatr',
    labelAz: 'Kinoteatr / Əyləncə',
    labelEn: 'Cinema / Entertainment',
    synonyms: ['kino', 'kinoteatr', 'cinema', 'əyləncə', 'entertainment', 'park', 'аттракцион'],
  },
  {
    key: 'musiqi',
    labelAz: 'Musiqi / İncəsənət',
    labelEn: 'Music / Arts',
    synonyms: ['musiqi', 'music', 'incəsənət', 'art', 'rəsm', 'qalereya', 'gallery', 'studio musiqi'],
  },

  // ── Other ────────────────────────────────────────────────────────────────
  {
    key: 'digər',
    labelAz: 'Digər',
    labelEn: 'Other',
    synonyms: ['digər', 'other', 'müxtəlif', 'various', 'başqa'],
  },
]
