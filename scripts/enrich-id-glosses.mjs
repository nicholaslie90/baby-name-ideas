#!/usr/bin/env node
/**
 * PROTOTYPE — report only. Does NOT modify any data file.
 *
 * 99% of the attested names carry English-only meanings. This script estimates
 * how many of those English meaning glosses could be auto-translated into
 * Indonesian using a curated, offline EN→ID glossary (no API, deterministic,
 * licence-clean). It classifies each name as fully / partially / not
 * translatable and prints the top remaining unknown words so the glossary can
 * be grown where it pays off most.
 *
 * Run: node scripts/enrich-id-glosses.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'src', 'data');
const load = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

// Function/grammar words: always "resolved" (some map to nothing).
const FUNCTION = {
  of: 'dari', the: '', a: '', an: '', and: 'dan', or: 'atau', to: 'untuk',
  in: 'di', on: 'di', at: 'di', with: 'dengan', who: 'yang', is: '', was: '',
  from: 'dari', for: 'untuk', by: 'oleh', as: 'sebagai', that: 'itu', this: 'ini',
  it: '', its: '', he: 'dia', she: 'dia', his: '', her: '', their: '', my: '',
  one: '', be: 'menjadi', has: 'memiliki', also: 'juga', very: 'sangat',
  most: 'paling', all: 'semua', like: 'seperti', where: 'tempat', after: 'menurut',
  near: 'dekat', me: 'aku', means: 'berarti', named: 'bernama',
};

// Curated content-word glossary (top ~320 words by frequency in the dataset).
const GLOSS = {
  god: 'dewa', name: 'nama', son: 'putra', town: 'kota', good: 'baik',
  flower: 'bunga', meadow: 'padang rumput', man: 'lelaki', bright: 'cerah',
  white: 'putih', ruler: 'penguasa', created: 'tercipta', goddess: 'dewi',
  famous: 'termasyhur', friend: 'teman', born: 'lahir', river: 'sungai',
  newly: 'baru', light: 'cahaya', valley: 'lembah', protector: 'pelindung',
  little: 'kecil', beautiful: 'cantik', leader: 'pemimpin', hill: 'bukit',
  noble: 'mulia', last: 'terakhir', strong: 'kuat', tree: 'pohon', small: 'kecil',
  woman: 'perempuan', people: 'rakyat', land: 'tanah', lord: 'tuan', peace: 'damai',
  red: 'merah', child: 'anak', gift: 'anugerah', ancient: 'kuno', sea: 'laut',
  daughter: 'putri', happy: 'bahagia', will: 'kehendak', king: 'raja',
  brave: 'berani', beloved: 'terkasih', forest: 'hutan', star: 'bintang',
  love: 'cinta', bird: 'burung', young: 'muda', life: 'kehidupan', wolf: 'serigala',
  area: 'wilayah', hair: 'rambut', spear: 'tombak', house: 'rumah', song: 'lagu',
  spring: 'mata air', rose: 'mawar', wise: 'bijaksana', soldier: 'prajurit',
  well: 'sumur', grace: 'anugerah', dark: 'gelap', war: 'perang', lion: 'singa',
  figure: 'tokoh', warrior: 'pejuang', island: 'pulau', field: 'ladang',
  shining: 'bersinar', water: 'air', girl: 'gadis', great: 'agung', city: 'kota',
  first: 'pertama', powerful: 'perkasa', divine: 'ilahi', wisdom: 'kebijaksanaan',
  pure: 'suci', black: 'hitam', fair: 'elok', old: 'tua', farm: 'ladang',
  strength: 'kekuatan', village: 'desa', holy: 'suci', servant: 'pelayan',
  sun: 'matahari', joy: 'sukacita', deer: 'rusa', moon: 'bulan', fire: 'api',
  stone: 'batu', victory: 'kemenangan', earth: 'bumi', rock: 'batu karang',
  bear: 'beruang', gentle: 'lembut', power: 'kekuatan', peaceful: 'damai',
  glory: 'kemuliaan', farmer: 'petani', home: 'rumah', jewel: 'permata',
  handsome: 'tampan', army: 'tentara', place: 'tempat', maker: 'pembuat',
  clan: 'marga', happiness: 'kebahagiaan', new: 'baru', father: 'ayah',
  lives: 'hidup', dove: 'merpati', wealthy: 'kaya', lover: 'kekasih',
  golden: 'keemasan', pretty: 'cantik', brilliant: 'cemerlang', stream: 'anak sungai',
  ocean: 'samudra', green: 'hijau', crossing: 'persimpangan', wealth: 'kekayaan',
  mountain: 'gunung', glorious: 'mulia', counselor: 'penasihat', mighty: 'perkasa',
  oak: 'pohon ek', raven: 'gagak', helmet: 'helm', chief: 'kepala suku',
  twins: 'kembar', ford: 'arungan', praise: 'pujian', sky: 'langit', queen: 'ratu',
  mother: 'ibu', royal: 'kerajaan', cliff: 'tebing', desire: 'hasrat', rich: 'kaya',
  lucky: 'beruntung', battle: 'pertempuran', beauty: 'keindahan', victorious: 'jaya',
  twin: 'kembar', wind: 'angin', night: 'malam', nymph: 'bidadari',
  fortunate: 'beruntung', generous: 'dermawan', country: 'negeri', brook: 'anak sungai',
  blessed: 'diberkati', smart: 'cerdas', garden: 'taman', swamp: 'rawa',
  present: 'hadiah', gray: 'kelabu', dear: 'tersayang', fame: 'kemasyhuran',
  feminine: 'feminin', lady: 'nyonya', plant: 'tanaman', vine: 'tanaman merambat',
  pledge: 'ikrar', high: 'tinggi', warlike: 'suka berperang', help: 'pertolongan',
  guardian: 'penjaga', judge: 'hakim', region: 'wilayah', crown: 'mahkota',
  estate: 'tanah milik', calm: 'tenang', gold: 'emas', violet: 'ungu', dawn: 'fajar',
  maiden: 'gadis', pearl: 'mutiara', princess: 'putri', messenger: 'utusan',
  long: 'panjang', boar: 'babi hutan', brother: 'saudara', second: 'kedua',
  sword: 'pedang', harvest: 'panen', saint: 'santo', brings: 'membawa',
  church: 'gereja', yellow: 'kuning', increase: 'pertambahan', wanderer: 'pengembara',
  blue: 'biru', rain: 'hujan', snow: 'salju', sacred: 'suci', honor: 'kehormatan',
  linden: 'pohon linden', lovely: 'elok', heaven: 'surga', sunrise: 'matahari terbit',
  western: 'barat', female: 'perempuan', wife: 'istri', fight: 'pertarungan',
  angel: 'malaikat', eagle: 'elang', follows: 'mengikuti', nobleman: 'bangsawan',
  prince: 'pangeran', given: 'diberikan', fortress: 'benteng', fort: 'benteng',
  full: 'penuh', brown: 'cokelat', heart: 'hati', triumphant: 'jaya',
  adviser: 'penasihat', hunter: 'pemburu', property: 'harta', loyal: 'setia',
  south: 'selatan', wood: 'hutan', fertile: 'subur', loved: 'dicintai',
  traveler: 'pengembara', horses: 'kuda', faith: 'iman', priest: 'pendeta',
  narrow: 'sempit', wreath: 'karangan bunga', goat: 'kambing', guide: 'pemandu',
  eyes: 'mata', middle: 'tengah', rabbit: 'kelinci', laughter: 'tawa',
  give: 'memberi', sweet: 'manis', world: 'dunia', laurel: 'salam',
  defiant: 'menantang', quiet: 'tenang', northern: 'utara', palm: 'pohon palem',
  thunder: 'guruh', hope: 'harapan', forever: 'selamanya', prayer: 'doa',
  lily: 'bunga lili', graceful: 'anggun', many: 'banyak', fiery: 'berapi-api',
  manly: 'jantan', spirit: 'roh', superior: 'unggul', ash: 'pohon abu',
  hero: 'pahlawan', become: 'menjadi', wide: 'luas', hollow: 'cekungan',
  wine: 'anggur', observant: 'jeli', courageous: 'berani', steady: 'teguh',
  cherished: 'disayangi', wild: 'liar', helps: 'menolong',
  // proper nouns / cultures kept (translated where there is a settled ID form)
  roman: 'Romawi', greek: 'Yunani', france: 'Prancis', britain: 'Britania',
  scotland: 'Skotlandia', rome: 'Roma', ireland: 'Irlandia', england: 'Inggris',
  scandinavian: 'Skandinavia', hawaiian: 'Hawaii', italian: 'Italia',
  frenchman: 'orang Prancis', christmas: 'Natal', mary: 'Maria', thor: 'Thor',
  zeus: 'Zeus', william: 'William',
  // descriptive compounds present in the data
  'dark-skinned': 'berkulit gelap', 'red-haired': 'berambut merah',
  'first-born': 'sulung',
};

// Glossary keys that are adjectives — these move AFTER the noun in Indonesian
// ("red earth" → "bumi merah"). Participles/adverbs are deliberately excluded
// so their natural pre-noun order is kept ("newly created" → "baru tercipta").
const ADJ = new Set([
  'good', 'bright', 'white', 'famous', 'little', 'beautiful', 'noble', 'last',
  'strong', 'small', 'red', 'ancient', 'happy', 'brave', 'beloved', 'young',
  'wise', 'dark', 'shining', 'great', 'first', 'powerful', 'divine', 'pure',
  'black', 'fair', 'old', 'holy', 'gentle', 'peaceful', 'handsome', 'new',
  'wealthy', 'golden', 'pretty', 'brilliant', 'green', 'glorious', 'mighty',
  'royal', 'rich', 'lucky', 'victorious', 'fortunate', 'generous', 'blessed',
  'smart', 'gray', 'dear', 'feminine', 'high', 'warlike', 'calm', 'long',
  'sacred', 'lovely', 'western', 'full', 'brown', 'triumphant', 'loyal',
  'fertile', 'loved', 'narrow', 'sweet', 'defiant', 'quiet', 'northern',
  'graceful', 'many', 'fiery', 'manly', 'superior', 'courageous', 'steady',
  'cherished', 'wild', 'yellow', 'blue', 'second', 'dark-skinned',
  'red-haired', 'first-born',
]);

// Second batch — the long-tail words that each unblock a handful of names
// (most are the SOLE missing word for the name). Base forms are used so the
// morphology layer catches inflections (rule→rules, heal→heals, willow→willows).
Object.assign(GLOSS, {
  men: 'para lelaki', youth: 'pemuda', luck: 'keberuntungan', fortune: 'keberuntungan',
  listen: 'mendengarkan', protection: 'perlindungan', replace: 'menggantikan',
  descend: 'keturunan', salvation: 'keselamatan', fighter: 'petarung', lotus: 'teratai',
  olive: 'zaitun', leaf: 'daun', fifth: 'kelima', ledge: 'tepian', gazelle: 'kijang',
  branch: 'cabang', graze: 'merumput', champion: 'juara', stable: 'kandang', add: 'menambah',
  fate: 'takdir', delight: 'kesenangan', bloom: 'mekar', falcon: 'rajawali', hawk: 'elang',
  grain: 'biji-bijian', virgin: 'perawan', grove: 'hutan kecil', lamb: 'anak domba',
  pasture: 'padang gembala', family: 'keluarga', heard: 'terdengar', winner: 'pemenang',
  county: 'wilayah', arrow: 'panah', cape: 'tanjung', rest: 'ketenangan', fox: 'rubah',
  secret: 'rahasia', storm: 'badai', yew: 'pohon yew', watchman: 'penjaga', month: 'bulan',
  nobility: 'kebangsawanan', morning: 'pagi', dew: 'embun', blossom: 'kembang',
  pleasure: 'kesenangan', truth: 'kebenaran', witness: 'saksi', rule: 'memerintah',
  resurrection: 'kebangkitan', oath: 'sumpah', serve: 'melayani', reward: 'ganjaran',
  defender: 'pembela', stutterer: 'si gagap', bridge: 'jembatan', comfort: 'penghiburan',
  cow: 'sapi', cross: 'salib', boy: 'anak lelaki', beaver: 'berang-berang', sailor: 'pelaut',
  stranger: 'orang asing', dragon: 'naga', fern: 'pakis', fish: 'ikan', healer: 'penyembuh',
  heal: 'menyembuhkan', shelter: 'naungan', hostage: 'sandera', knowledge: 'pengetahuan',
  staff: 'tongkat', observer: 'pengamat', clearing: 'lahan terbuka', temple: 'kuil',
  savior: 'penyelamat', echo: 'gema', sign: 'tanda', trip: 'perjalanan', cub: 'anak hewan',
  horn: 'tanduk', paddock: 'padang', mill: 'penggilingan', lake: 'danau', moor: 'padang rumput',
  northerner: 'orang utara', north: 'utara', miracle: 'keajaiban', eighth: 'kedelapan',
  dignity: 'martabat', cottage: 'pondok', wall: 'tembok', shield: 'perisai', apple: 'apel',
  orchard: 'kebun', compassion: 'belas kasih', seventh: 'ketujuh', summer: 'musim panas',
  nature: 'alam', road: 'jalan', ridge: 'punggung bukit', tiger: 'harimau', willow: 'pohon dedalu',
  winter: 'musim dingin', courage: 'keberanian', west: 'barat', silver: 'perak',
  springtime: 'musim semi', wave: 'ombak', mercy: 'belas kasih', evening: 'petang',
  birth: 'kelahiran', patience: 'kesabaran', honey: 'madu', talk: 'bicara', emerald: 'zamrud',
  devotion: 'pengabdian', unity: 'persatuan', horseman: 'penunggang kuda', sprite: 'peri',
  save: 'menyelamatkan', forefather: 'leluhur', shine: 'bersinar',
  // proper nouns / cultures with settled Indonesian forms
  german: 'Jerman', germany: 'Jerman', greece: 'Yunani', italy: 'Italia', trojan: 'Troya',
  scottish: 'Skotlandia', gypsy: 'gipsi', sunday: 'Minggu', adam: 'Adam', john: 'Yohanes',
  hugh: 'Hugh', st: 'santo',
});

// Adjectives from the second batch (placed after the noun in Indonesian).
for (const a of [
  'merciful', 'healthy', 'just', 'prosperous', 'joyful', 'fragrant', 'blond', 'proud',
  'bold', 'innocent', 'charitable', 'righteous', 'bitter', 'chosen', 'heavenly', 'purple',
  'alive', 'attractive', 'delicate', 'faithful', 'friendly', 'glad', 'virginal', 'majestic',
  'eager', 'fierce', 'virtuous', 'blind', 'clear', 'hairy', 'earnest', 'hard', 'perfect',
  'tall', 'low', 'immortal', 'aromatic', 'ripe', 'stony', 'southern', 'godly', 'constant',
  'gracious', 'precious', 'industrious', 'smooth', 'honorable', 'wonderful', 'downy',
  'active', 'tender', 'hospitable', 'honest', 'ready', 'compassionate', 'difficult',
  'unique', 'thin',
]) {
  ADJ.add(a);
}
Object.assign(GLOSS, {
  merciful: 'penyayang', healthy: 'sehat', just: 'adil', prosperous: 'makmur',
  joyful: 'riang', fragrant: 'harum', blond: 'pirang', proud: 'bangga', bold: 'berani',
  innocent: 'polos', charitable: 'dermawan', righteous: 'saleh', bitter: 'pahit',
  chosen: 'terpilih', heavenly: 'surgawi', purple: 'ungu', alive: 'hidup',
  attractive: 'menarik', delicate: 'lembut', faithful: 'setia', friendly: 'ramah',
  glad: 'gembira', virginal: 'suci', majestic: 'agung', eager: 'bersemangat',
  fierce: 'garang', virtuous: 'berbudi', blind: 'buta', clear: 'jernih', hairy: 'berbulu',
  earnest: 'sungguh-sungguh', hard: 'keras', perfect: 'sempurna', tall: 'tinggi',
  low: 'rendah', immortal: 'abadi', aromatic: 'harum', ripe: 'matang', stony: 'berbatu',
  southern: 'selatan', godly: 'saleh', constant: 'tetap', gracious: 'anggun',
  precious: 'berharga', industrious: 'rajin', smooth: 'halus', honorable: 'terhormat',
  wonderful: 'menakjubkan', downy: 'berbulu halus', active: 'aktif', tender: 'lembut',
  hospitable: 'ramah', honest: 'jujur', ready: 'siap', compassionate: 'penyayang',
  difficult: 'sukar', unique: 'unik', thin: 'kurus',
});

// Third batch — flatter tail (~2-3 names each). Includes "Ing", the Norse god
// behind Ingemar/Ingvar (not a morphology artifact).
Object.assign(GLOSS, {
  mythological: 'mitologis', here: 'di sini', 'right-handed': 'tangan kanan',
  heather: 'bunga heather', three: 'tiga', shepherd: 'gembala', barn: 'lumbung',
  companion: 'sahabat', bishop: 'uskup', bow: 'busur', brewer: 'pembuat bir',
  citizen: 'warga', dweller: 'penghuni', candle: 'lilin', scholar: 'cendekiawan',
  barrel: 'tong', irish: 'Irlandia', castle: 'kastil', park: 'taman', nicholas: 'Nikolas',
  order: 'tatanan', comforter: 'penghibur', flute: 'seruling', official: 'pejabat',
  knight: 'kesatria', holiday: 'hari raya', court: 'istana', poet: 'penyair',
  competitor: 'pesaing', denmark: 'Denmark', resident: 'penghuni', dennis: 'Dennis',
  ox: 'lembu', win: 'menang', brow: 'kening', elm: 'pohon elm', gardener: 'tukang kebun',
  rejoice: 'bersukacita', redhead: 'si rambut merah', harry: 'Harry', hall: 'aula',
  greatly: 'sangat', holly: 'tanaman holly', robert: 'Robert', mind: 'pikiran',
  giant: 'raksasa', gate: 'gerbang', struggle: 'perjuangan', archer: 'pemanah',
  ivory: 'gading', ing: 'Ing', norwegian: 'Norwegia', crying: 'tangisan', smoke: 'asap',
  jay: 'burung jay', hyacinth: 'bunga eceng', see: 'melihat', blackbird: 'burung hitam',
  african: 'Afrika', voice: 'suara', cherry: 'ceri', top: 'puncak', monday: 'Senin',
  protect: 'melindungi', pool: 'kolam', lime: 'jeruk nipis', mariner: 'pelaut',
  border: 'perbatasan', marsh: 'rawa', blacksmith: 'pandai besi', leopard: 'macan tutul',
  daffodil: 'bunga bakung', royalty: 'bangsawan', jehovah: 'Yehuwa', israel: 'Israel',
  bliss: 'kebahagiaan', kindness: 'kebaikan', peter: 'Petrus', easter: 'Paskah',
  enclosure: 'kandang', pillar: 'pilar', piece: 'kepingan', coming: 'kedatangan',
  ant: 'semut', grass: 'rumput', behold: 'lihatlah', foot: 'kaki', pomegranate: 'delima',
  shrub: 'semak', breeze: 'angin sepoi', judgment: 'penghakiman', rook: 'gagak',
  rye: 'gandum hitam', woodworker: 'tukang kayu', treasure: 'harta karun', tailor: 'penjahit',
  end: 'ujung', conquer: 'menaklukkan', government: 'pemerintahan', wagon: 'gerobak',
  builder: 'pembangun', wales: 'Wales', bringer: 'pembawa', bearer: 'pembawa',
  giver: 'pemberi', keeper: 'penjaga',
});
for (const a of [
  'blonde', 'devoted', 'big', 'broad', 'firm', 'bald', 'slender', 'curly', 'tame',
  'dusty', 'everlasting', 'hidden', 'rocky', 'quick', 'foreign', 'supreme', 'round',
  'tough', 'fortified', 'intelligent', 'tawny', 'renowned', 'valuable', 'divided',
  'hostile', 'uncultivated', 'learned', 'capable', 'sad', 'enchanting', 'snow-covered',
  'bearlike', 'esteemed', 'respected', 'flat', 'pious', 'able', 'reborn', 'patient',
  'radiant', 'damp', 'twisting', 'exalted', 'enlightened',
]) {
  ADJ.add(a);
}
Object.assign(GLOSS, {
  blonde: 'pirang', devoted: 'berbakti', big: 'besar', broad: 'lebar', firm: 'teguh',
  bald: 'botak', slender: 'ramping', curly: 'keriting', tame: 'jinak', dusty: 'berdebu',
  everlasting: 'abadi', hidden: 'tersembunyi', rocky: 'berbatu', quick: 'cepat',
  foreign: 'asing', supreme: 'tertinggi', round: 'bundar', tough: 'tangguh',
  fortified: 'berbenteng', intelligent: 'cerdas', tawny: 'cokelat kekuningan',
  renowned: 'termasyhur', valuable: 'berharga', divided: 'terbagi', hostile: 'bermusuhan',
  uncultivated: 'tak tergarap', learned: 'terpelajar', capable: 'cakap', sad: 'sedih',
  enchanting: 'memikat', 'snow-covered': 'berselimut salju', bearlike: 'seperti beruang',
  esteemed: 'dihormati', respected: 'dihormati', flat: 'datar', pious: 'saleh',
  able: 'cakap', reborn: 'terlahir kembali', patient: 'sabar', radiant: 'berseri',
  damp: 'lembap', twisting: 'berliku', exalted: 'ditinggikan', enlightened: 'tercerahkan',
});

// Fourth batch — final push toward ~75%. Mostly nature words, kinship terms,
// and proper nouns with settled Indonesian forms.
Object.assign(GLOSS, {
  rush: 'gelagah', wheat: 'gandum', newborn: 'bayi baru lahir', weir: 'bendungan',
  succeed: 'berhasil', answer: 'jawaban', respect: 'penghormatan', mankind: 'umat manusia',
  helper: 'penolong', sacrifice: 'pengorbanan', lioness: 'singa betina', continent: 'benua',
  elf: 'peri', melody: 'melodi', smile: 'senyum', blessing: 'berkah', camp: 'perkemahan',
  coral: 'karang', shape: 'bentuk', cup: 'cawan', harmony: 'keselarasan', bee: 'lebah',
  sorrow: 'kesedihan', day: 'hari', dolphin: 'lumba-lumba', calf: 'anak sapi',
  tenth: 'kesepuluh', embrace: 'merangkul', egypt: 'Mesir', idol: 'berhala',
  virtue: 'kebajikan', fountain: 'air mancur', heroine: 'pahlawan wanita', beach: 'pantai',
  orchid: 'anggrek', hunt: 'perburuan', jade: 'giok', autumn: 'musim gugur', gem: 'permata',
  ice: 'es', plenty: 'kelimpahan', tent: 'tenda', rainbow: 'pelangi', kitten: 'anak kucing',
  dance: 'tarian', title: 'gelar', mist: 'kabut', marvel: 'keajaiban', teacher: 'guru',
  apricot: 'aprikot', rebirth: 'kelahiran kembali', ninth: 'kesembilan', anticipation: 'harapan',
  footprint: 'jejak', fourth: 'keempat', plum: 'prem', 'second-born': 'anak kedua',
  counsel: 'nasihat', arise: 'bangkit', plain: 'dataran', parvati: 'Parwati', season: 'musim',
  seeker: 'pencari', justice: 'keadilan', peony: 'bunga peoni', flock: 'kawanan', sheep: 'domba',
  possession: 'kepunyaan', being: 'makhluk', anne: 'Anna', destroyer: 'penghancur',
  bowman: 'pemanah', arm: 'lengan', artemis: 'Artemis', hebrew: 'Ibrani', husband: 'suami',
  ancestor: 'leluhur', hardship: 'kesukaran', jealousy: 'kecemburuan', owner: 'pemilik',
  birch: 'pohon birch', mountaintop: 'puncak gunung', british: 'Britania', barley: 'jelai',
  ben: 'putra', badger: 'luak', ax: 'kapak', baron: 'bangsawan', build: 'membangun',
  time: 'waktu', dog: 'anjing', christ: 'Kristus', hold: 'memegang', carry: 'membawa',
  clay: 'tanah liat', bed: 'ranjang', cushion: 'bantal', much: 'banyak', michael: 'Mikhael',
  woodcarver: 'pemahat kayu', chancellor: 'kanselir', rooster: 'ayam jantan',
  herder: 'penggembala', crane: 'burung bangau', knife: 'pisau', dale: 'lembah',
  english: 'Inggris', david: 'Daud', dell: 'lembah kecil', riverbank: 'tepi sungai',
  lamp: 'lampu', dagger: 'belati', gather: 'mengumpulkan', together: 'bersama',
  glacier: 'gletser', make: 'membuat', trainer: 'pelatih', ghana: 'Ghana', bull: 'banteng',
  latin: 'Latin', run: 'berlari', spin: 'berputar', narcissus: 'narsis',
});
for (const a of [
  'fast', 'white-haired', 'enclosed', 'obedient', 'worthy', 'lively', 'chaste', 'truthful',
  'lovable', 'freckled', 'anointed', 'lame', 'sunny', 'grand', 'serene', 'pleasant',
  'youthful', 'ethical', 'complete', 'soft', 'tiny', 'content', 'safe', 'successful',
  'agreeable', 'fresh', 'praiseworthy', 'deserving', 'zealous', 'determined', 'free',
  'afire', 'oldest', 'speckled', 'male', 'elevated', 'kind', 'polite', 'red-headed',
  'brown-skinned', 'illuminated', 'joined', 'consecrated', 'elder',
]) {
  ADJ.add(a);
}
Object.assign(GLOSS, {
  fast: 'cepat', 'white-haired': 'berambut putih', enclosed: 'tertutup', obedient: 'patuh',
  worthy: 'layak', lively: 'lincah', chaste: 'suci', truthful: 'jujur', lovable: 'menggemaskan',
  freckled: 'berbintik', anointed: 'terurapi', lame: 'pincang', sunny: 'cerah', grand: 'agung',
  serene: 'tenang', pleasant: 'menyenangkan', youthful: 'awet muda', ethical: 'beretika',
  complete: 'lengkap', soft: 'lembut', tiny: 'mungil', content: 'puas', safe: 'aman',
  successful: 'sukses', agreeable: 'ramah', fresh: 'segar', praiseworthy: 'terpuji',
  deserving: 'layak', zealous: 'bersemangat', determined: 'bertekad', free: 'bebas',
  afire: 'menyala', oldest: 'tertua', speckled: 'berbintik', male: 'jantan',
  elevated: 'ditinggikan', kind: 'baik hati', polite: 'sopan', 'red-headed': 'berambut merah',
  'brown-skinned': 'berkulit cokelat', illuminated: 'bercahaya', joined: 'bersatu',
  consecrated: 'disucikan', elder: 'tua',
});

// Glosses that signal a non-meaning (skip — these are source noise, not arti).
const JUNK = [
  'unknown', 'definition', 'variation', 'version of', 'combination',
  'nickname', 'diminutive', 'form of', 'mythological figure', 'short for',
];

const ARTICLES = new Set(['the', 'a', 'an']);

/**
 * Look up one English token. Returns:
 *   { fn:true, id }      → function word (no content weight)
 *   { key, id, adj }     → resolved content word (with its canonical key)
 *   { miss:true, base }  → unknown content word
 */
function lookup(raw) {
  const w = raw.replace(/^'+|'+$/g, '').replace(/'s$/, '');
  if (!w) return { fn: true, id: '' };
  if (Object.prototype.hasOwnProperty.call(FUNCTION, w)) return { fn: true, id: FUNCTION[w] };
  const cands = [w];
  if (w.endsWith('es')) cands.push(w.slice(0, -2));
  if (w.endsWith('s')) cands.push(w.slice(0, -1));
  if (w.endsWith('ing')) cands.push(w.slice(0, -3), w.slice(0, -3) + 'e');
  if (w.endsWith('ed')) cands.push(w.slice(0, -2), w.slice(0, -1));
  for (const c of cands) {
    if (Object.prototype.hasOwnProperty.call(GLOSS, c)) {
      return { key: c, id: GLOSS[c], adj: ADJ.has(c) };
    }
  }
  return { miss: true, base: w };
}

/**
 * Render one "of"-free chunk as an Indonesian noun phrase, applying:
 *   - articles dropped
 *   - adjectives moved AFTER the noun(s) ("red earth" → "bumi merah")
 *   - coordinated adjectives kept with "dan" ("old and wise" → "tua dan bijaksana")
 *   - a trailing nominalizer "one" → leading "yang" ("strong one" → "yang kuat")
 * Mutates the shared `acc` counters {total, hit, miss}.
 */
function renderChunk(tokens, acc) {
  let words = tokens.filter((t) => !ARTICLES.has(t.replace(/^'+|'+$/g, '')));
  let yang = false;
  if (words.length > 1 && words[words.length - 1].replace(/'s$/, '') === 'one') {
    yang = true;
    words = words.slice(0, -1);
  }

  const nouns = [];
  const adjs = [];
  let hadAnd = false;
  for (const word of words) {
    const r = lookup(word);
    if (r.fn) {
      if (word === 'and') hadAnd = true;
      else if (r.id) nouns.push(r.id); // rare inline function word
      continue;
    }
    acc.total++;
    if (r.miss) {
      acc.miss.push(r.base);
      nouns.push(word); // leave the English word in place
      continue;
    }
    acc.hit++;
    if (!r.id) continue;
    (r.adj ? adjs : nouns).push(r.id);
  }

  const adjText = adjs.length > 1 && hadAnd ? adjs.join(' dan ') : adjs.join(' ');
  // Coordinated nouns with no adjective keep their "dan" ("joy and light").
  const nounText = hadAnd && adjs.length === 0 && nouns.length > 1 ? nouns.join(' dan ') : nouns.join(' ');
  if (yang) return ['yang', nounText, adjText].filter(Boolean).join(' ');
  return [nounText, adjText].filter(Boolean).join(' ');
}

/** Translate one gloss; returns { id, total, hit, miss:[words] }. */
function translate(gloss) {
  const segments = gloss.toLowerCase().split(/\s*[,;]\s*/).filter(Boolean);
  const acc = { total: 0, hit: 0, miss: [] };
  const out = [];
  for (const seg of segments) {
    const clean = seg.replace(/[^a-z\s'-]/g, ' ');
    // Split a genitive ("man of the red earth") and rejoin chunks with "dari".
    const chunks = clean.split(/\s+of\s+/).map((c) => c.split(/\s+/).filter(Boolean));
    const rendered = chunks.map((c) => renderChunk(c, acc)).filter(Boolean);
    if (rendered.length) out.push(rendered.join(' dari '));
  }
  return { id: out.join(', '), total: acc.total, hit: acc.hit, miss: acc.miss };
}

export { translate, GLOSS, FUNCTION, ADJ, JUNK, load };

// ---- run the report (only when invoked directly, not on import) ----
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) runReport();

function runReport() {
const names = [...load('commonNames.json'), ...load('commonNamesImported.json')]
  .filter((n) => n.meaning.id === n.meaning.en); // English-only entries

let full = 0;
let partial = 0;
let none = 0;
let junk = 0;
const missFreq = new Map();
const examples = [];

for (const n of names) {
  const en = n.meaning.en;
  if (JUNK.some((j) => en.toLowerCase().includes(j))) {
    junk++;
    continue;
  }
  const r = translate(en);
  if (r.total === 0) {
    none++;
  } else if (r.hit === r.total) {
    full++;
    if (examples.length < 12) examples.push(`${n.name.padEnd(12)} ${en}  →  ${r.id}`);
  } else if (r.hit > 0) {
    partial++;
  } else {
    none++;
  }
  for (const m of r.miss) missFreq.set(m, (missFreq.get(m) || 0) + 1);
}

const translatable = names.length - junk;
const pct = (x) => `${((x / translatable) * 100).toFixed(1)}%`;

console.log('═══ Indonesian gloss enrichment — coverage report (prototype) ═══\n');
console.log(`English-only names:     ${names.length}`);
console.log(`Junk/non-meaning glosses (skipped): ${junk}`);
console.log(`Translatable candidates: ${translatable}\n`);
console.log(`Fully translatable:   ${full}  (${pct(full)})`);
console.log(`Partially:            ${partial}  (${pct(partial)})`);
console.log(`Not at all:           ${none}  (${pct(none)})`);
console.log(`Glossary size:        ${Object.keys(GLOSS).length} content words + ${Object.keys(FUNCTION).length} function words\n`);

console.log('── Sample full translations ──');
for (const e of examples) console.log('  ' + e);

console.log('\n── Top 40 missing words (grow the glossary here) ──');
const top = [...missFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
top.forEach(([w, c], i) => {
  process.stdout.write(`${(w + ' (' + c + ')').padEnd(20)}${(i + 1) % 4 === 0 ? '\n' : ''}`);
});
console.log('\n');
}
