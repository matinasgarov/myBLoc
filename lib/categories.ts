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
    labelAz: 'Café / Coffee Shop',
    labelEn: 'Café / Coffee Shop',
    synonyms: ['kafe', 'kofe', 'qəhvə', 'coffee', 'kahve'],
  },
  {
    key: 'fast food',
    labelAz: 'Fast Food',
    labelEn: 'Fast Food',
    synonyms: ['fast food', 'fastfood', 'burger', 'snack', 'dönər', 'shawarma', 'fast', 'food'],
  },
  {
    key: 'pizza',
    labelAz: 'Pizza',
    labelEn: 'Pizza',
    synonyms: ['pizza', 'lahmacun'],
  },
  {
    key: 'Çayxana',
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
    labelAz: 'Elektronika / Tech',
    labelEn: 'Electronics / Tech',
    synonyms: ['komputer', 'telefon', 'laptop', 'mobil', 'texnika', 'gadget', 'tech', 'electronics'],
  },
  {
    key: 'kitab',
    labelAz: 'Kitabçı / Ləvazimat',
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
    key: 'pivexana',
    labelAz: 'Pub / Bar',
    labelEn: 'Pub / Bar ',
    synonyms: ['bar', 'pub', 'içki', 'alkoqol', 'nightclub', 'pivəxana', 'pivə', 'beer', 'brewery', 'craft beer', 'tap house', 'brauhaus'],
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
    labelAz: 'Avtomobil Satışı / Avto Salon',
    labelEn: 'Car Dealership / Auto Salon',
    synonyms: ['avtomobil satış', 'maşın satışı', 'car dealer', 'ikinci əl', 'used car', 'salon avto'],
  },
  {
    key: 'hüquq',
    labelAz: 'Hüquq / Notariat/ Vəkil',
    labelEn: 'Legal / Notary / Lawyer',
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
  // ── Automotive (extended) ─────────────────────────────────────────────────
{
  key: 'avto detal',
  labelAz: 'Avto Ehtiyat Hissələri',
  labelEn: 'Auto Parts Store',
  synonyms: ['avto detal', 'ehtiyat hissə', 'zapçast', 'auto parts', 'car parts', 'şina', 'akumulator', 'mühərrik'],
},
{
  key: 'avtomobil yuma',
  labelAz: 'Avtomobil Yuma / Car Wash',
  labelEn: 'Car Wash',
  synonyms: ['car wash', 'avtomobil yuma', 'maşın yuma', 'avto yuma', 'detailing', 'polishing'],
},
{
  key: 'avto şin',
  labelAz: 'Şin / Disk Mağazası',
  labelEn: 'Tyre & Wheel Shop',
  synonyms: ['şin', 'disk', 'tyre', 'tire', 'wheel', 'balans', 'şinmonтaj', 'avto şin'],
},
{
  key: 'texniki baxış',
  labelAz: 'Texniki Baxış / Diaqnostika',
  labelEn: 'Vehicle Inspection / Diagnostics',
  synonyms: ['texniki baxış', 'diaqnostika', 'MOT', 'car inspection', 'maşın yoxlama', 'kompüter diaqnostika'],
},

// ── Gaming & Entertainment (extended) ────────────────────────────────────
{
  key: 'playstation',
  labelAz: 'PlayStation Klubu',
  labelEn: 'PlayStation Club',
  synonyms: ['playstation', 'ps4', 'ps5', 'xbox', 'gaming club', 'oyun klubu', 'konsol', 'console', 'video game'],
},
{
  key: 'internet kafe',
  labelAz: 'İnternet Kafe / Cyber Cafe',
  labelEn: 'Internet Café / Cyber Café',
  synonyms: ['internet kafe', 'cyber cafe', 'internet club', 'komputer kafe', 'gaming pc', 'net kafe'],
},
{
  key: 'bowling',
  labelAz: 'Bowling / Əyləncə Mərkəzi',
  labelEn: 'Bowling / Entertainment Center',
  synonyms: ['bowling', 'əyləncə mərkəzi', 'amusement', 'arcade', 'fun center', 'uşaq əyləncə'],
},
{
  key: 'həmam',
  labelAz: 'Hamam / Sauna',
  labelEn: 'Hammam / Sauna',
  synonyms: ['həmam', 'hamam', 'sauna', 'banya', 'steam bath', 'turkish bath', 'hamamı'],
},

// ── Food & Beverage (extended) ───────────────────────────────────────────
{
  key: 'dondurma',
  labelAz: 'Dondurma / Milkshake',
  labelEn: 'Ice Cream / Milkshake',
  synonyms: ['dondurma', 'ice cream', 'milkshake', 'gelato', 'frozen yogurt', 'smoothie'],
},
{
  key: 'sushi',
  labelAz: 'Sushi / Asiya Mətbəxi',
  labelEn: 'Sushi / Asian Cuisine',
  synonyms: ['sushi', 'asian food', 'asiya', 'ramen', 'wok', 'chinese', 'japanese', 'çin xörəyi'],
},
{
  key: 'qəssab',
  labelAz: 'Qəssab / Ət Mağazası',
  labelEn: 'Butcher / Meat Shop',
  synonyms: ['qəssab', 'ət', 'butcher', 'meat', 'kababxana', 'quzu', 'mal əti', 'toyuq'],
},
{
  key: 'pivəxana',
  labelAz: 'Pivəxana / Craft Beer',
  labelEn: 'Brewery / Craft Beer',
  synonyms: ['pivəxana', 'pivə', 'beer', 'brewery', 'craft beer', 'tap house', 'brauhaus'],
},

// ── Health & Beauty (extended) ────────────────────────────────────────────
{
  key: 'dırnaq',
  labelAz: 'Dırnaq Salonu / Nail Bar',
  labelEn: 'Nail Salon / Nail Bar',
  synonyms: ['dırnaq', 'nail', 'manicure', 'manikür', 'pedicure', 'pedikür', 'nail bar', 'nail art'],
},
{
  key: 'tatoo',
  labelAz: 'Tattoo / Piercing Studiyası',
  labelEn: 'Tattoo / Piercing Studio',
  synonyms: ['tatoo', 'tattoo', 'piercing', 'dövmə', 'tattoo studio', 'body art'],
},
{
  key: 'psixoloq',
  labelAz: 'Psixoloji Xidmət',
  labelEn: 'Psychological Services',
  synonyms: ['psixoloq', 'psixologiya', 'therapist', 'therapy', 'mental health', 'counseling', 'psixiatr'],
},
{
  key: 'laboratoriya',
  labelAz: 'Tibbi Laboratoriya / Analiz',
  labelEn: 'Medical Lab / Analysis',
  synonyms: ['laboratoriya', 'analiz', 'qan analizi', 'lab', 'blood test', 'medical lab', 'tibbi analiz'],
},

// ── Home & Repair ─────────────────────────────────────────────────────────
{
  key: 'elektrik ustası',
  labelAz: 'Elektrik / Santexnik Usta',
  labelEn: 'Electrician / Plumber',
  synonyms: ['elektrik', 'santexnik', 'usta', 'plumber', 'electrician', 'qaz ustası', 'su ustası', 'təmir usta'],
},
{
  key: 'mebel sifarişi',
  labelAz: 'Sifarişlə Mebel İstehsalı',
  labelEn: 'Custom Furniture Manufacturing',
  synonyms: ['sifarişlə mebel', 'mebel fabrik', 'custom furniture', 'taxtaçı', 'dülger', 'carpenter', 'furniture maker'],
},
{
  key: 'ev alətləri',
  labelAz: 'Ev Texnikası / Alətlər',
  labelEn: 'Home Appliances / Tools',
  synonyms: ['ev texnikası', 'alət', 'ləvazimat', 'home appliances', 'tools', 'hardware', 'soyuducu', 'paltaryuyan'],
},

// ── Retail (niche) ────────────────────────────────────────────────────────
{
  key: 'oyuncaq',
  labelAz: 'Oyuncaq Mağazası',
  labelEn: 'Toy Store',
  synonyms: ['oyuncaq', 'toy', 'toy store', 'uşaq oyuncaq', 'lego', 'doll', 'kukla'],
},
{
  key: 'heyvan mağazası',
  labelAz: 'Heyvan Mağazası / Pet Shop',
  labelEn: 'Pet Shop',
  synonyms: ['heyvan mağazası', 'pet shop', 'petshop', 'it qidası', 'pişik ləvazimatı', 'quş', 'akvarium'],
},
{
  key: 'ikinci əl',
  labelAz: 'İkinci Əl / Komisyon',
  labelEn: 'Second Hand / Thrift',
  synonyms: ['ikinci əl', 'komisyon', 'second hand', 'thrift', 'used goods', 'vintage', 'antika'],
},
{
  key: 'hədiyyə',
  labelAz: 'Hədiyyə / Suvenir Mağazası',
  labelEn: 'Gift / Souvenir Shop',
  synonyms: ['hədiyyə', 'suvenir', 'gift', 'souvenir', 'birthday gift', 'ad günü', 'toy hədiyyə'],
},

// ── Events & Occasions ────────────────────────────────────────────────────
{
  key: 'toy sarayı',
  labelAz: 'Şadlıq Sarayı / Şənlik Evi',
  labelEn: 'Wedding Hall / Event Hall',
  synonyms: ['toy sarayı', 'şənlik evi', 'wedding hall', 'banquet hall', 'event hall', 'toy', 'ziyafət'],
},
{
  key: 'kənd evi',
  labelAz: 'Bağ Evi Kirayəsi',
  labelEn: 'Cottage Rental',
  synonyms: ['kənd evi', 'bağ evi', 'dacha', 'cottage', 'villa kirayə', 'istirahət evi', 'country house'],
},
{
  key: 'kafe toy',
  labelAz: 'Uşaq Tədbirləri / Animasiya',
  labelEn: 'Kids Events / Animation',
  synonyms: ['animasiya', 'uşaq tədbirlər', 'kids party', 'ad günü uşaq', 'animator', 'clown', 'event kids'],
},

// ── Finance (extended) ────────────────────────────────────────────────────
{
  key: 'valyuta',
  labelAz: 'Valyuta Mübadiləsi',
  labelEn: 'Currency Exchange',
  synonyms: ['valyuta', 'dollar', 'currency exchange', 'mübadilə', 'forex', 'exchange office', 'məzənnə'],
},
{
  key: 'kredit',
  labelAz: 'Mikromaliyyə / Kredit',
  labelEn: 'Microfinance / Credit',
  synonyms: ['kredit', 'borc', 'mikromaliyyə', 'loan', 'microfinance', 'nəğd kredit', 'ipoteka'],
},

// ── Education (extended) ─────────────────────────────────────────────────
{
  key: 'dil mərkəzi',
  labelAz: 'Dil Mərkəzi / Xarici Dil',
  labelEn: 'Language Center',
  synonyms: ['dil mərkəzi', 'ingilis dili', 'english', 'ielts', 'toefl', 'language school', 'xarici dil', 'rus dili'],
},
{
  key: 'sürücülük məktəbi',
  labelAz: 'Sürücülük Məktəbi',
  labelEn: 'Driving School',
  synonyms: ['sürücülük məktəbi', 'driving school', 'sürücü kursu', 'avtomobil kursu', 'vəsiqə', 'driving license'],
},
]
