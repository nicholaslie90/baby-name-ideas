/**
 * Synonym expansion for the By-meaning search. Each cluster groups related
 * meaning words across English AND Indonesian (one sense per cluster, to avoid
 * polysemous bleed). Typing any word in a cluster also searches its siblings,
 * so "brave" finds a part glossed "valiant" and "berani" finds "brave".
 *
 * Expansion is purely additive — the words the user typed are always kept.
 *
 * Very short Indonesian words (e.g. "air", "api") are deliberately omitted:
 * the gloss search is substring-based, so "air" would spuriously match "fair".
 */
const SYNONYM_CLUSTERS: string[][] = [
  ['brave', 'courageous', 'valiant', 'bold', 'fearless', 'gallant', 'berani', 'gagah', 'perkasa', 'tangguh'],
  ['strong', 'mighty', 'powerful', 'sturdy', 'kuat', 'perkasa', 'tegap'],
  ['light', 'bright', 'radiant', 'luminous', 'shining', 'glow', 'cahaya', 'terang', 'sinar', 'bercahaya', 'berseri'],
  ['love', 'beloved', 'affection', 'dear', 'cinta', 'kasih', 'sayang', 'terkasih', 'tercinta'],
  ['joy', 'happy', 'happiness', 'joyful', 'cheerful', 'glad', 'glee', 'bahagia', 'gembira', 'ceria', 'sukacita', 'riang'],
  ['peace', 'peaceful', 'calm', 'serene', 'tranquil', 'damai', 'tenang', 'tenteram', 'kedamaian'],
  ['wisdom', 'wise', 'prudent', 'sage', 'bijak', 'bijaksana', 'arif', 'cerdas'],
  ['beauty', 'beautiful', 'lovely', 'fair', 'graceful', 'pretty', 'indah', 'cantik', 'elok', 'jelita', 'rupawan'],
  ['gift', 'present', 'anugerah', 'pemberian', 'karunia', 'hadiah'],
  ['hope', 'harapan', 'asa', 'cita-cita'],
  ['faith', 'faithful', 'devout', 'trust', 'iman', 'percaya', 'setia'],
  ['noble', 'honorable', 'dignified', 'regal', 'mulia', 'bangsawan', 'terhormat', 'luhur'],
  ['victory', 'victorious', 'triumph', 'conqueror', 'winner', 'kemenangan', 'menang', 'jaya', 'pemenang'],
  ['star', 'bintang'],
  ['moon', 'lunar', 'bulan', 'rembulan'],
  ['sun', 'solar', 'sunshine', 'matahari', 'surya', 'mentari'],
  ['sky', 'heaven', 'heavenly', 'celestial', 'langit', 'surga', 'angkasa', 'kayangan'],
  ['flower', 'blossom', 'bloom', 'floral', 'bunga', 'kembang', 'kusuma', 'puspa', 'mekar'],
  ['sea', 'ocean', 'marine', 'laut', 'samudra', 'bahari'],
  ['gold', 'golden', 'gilded', 'emas', 'keemasan'],
  ['grace', 'mercy', 'compassion', 'kindness', 'kind', 'gentle', 'rahmat', 'lembut', 'ramah'],
  ['pure', 'innocent', 'holy', 'sacred', 'suci', 'murni', 'bersih', 'kudus'],
  ['life', 'living', 'alive', 'vitality', 'hidup', 'kehidupan', 'nyawa'],
  ['truth', 'true', 'honest', 'sincere', 'kebenaran', 'jujur', 'sejati', 'tulus'],
  ['leader', 'king', 'ruler', 'lord', 'chief', 'sovereign', 'pemimpin', 'raja', 'penguasa'],
  ['protector', 'guardian', 'defender', 'shield', 'pelindung', 'penjaga', 'pembela', 'perisai'],
  ['blessed', 'blessing', 'fortunate', 'lucky', 'diberkati', 'beruntung', 'bertuah'],
  ['free', 'freedom', 'liberty', 'independent', 'bebas', 'merdeka', 'kebebasan'],
  ['eternal', 'everlasting', 'immortal', 'forever', 'abadi', 'kekal', 'langgeng'],
  ['dawn', 'sunrise', 'daybreak', 'fajar', 'subuh'],
  ['fire', 'flame', 'blaze', 'burning', 'bara', 'nyala', 'kobaran'],
  ['mountain', 'peak', 'summit', 'gunung', 'puncak'],
  ['song', 'melody', 'music', 'singer', 'lagu', 'nyanyian', 'irama', 'kidung'],
  ['dream', 'vision', 'mimpi', 'impian'],
  ['gem', 'jewel', 'treasure', 'precious', 'permata', 'ratna', 'intan', 'mutiara', 'berlian'],
  ['honor', 'glory', 'glorious', 'fame', 'renowned', 'kehormatan', 'kemuliaan', 'kejayaan', 'masyhur', 'termasyhur'],
  ['miracle', 'wonder', 'marvel', 'keajaiban', 'mukjizat', 'ajaib'],
];

/** word -> all words sharing a cluster with it (including itself). */
const INDEX: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const cluster of SYNONYM_CLUSTERS) {
    for (const word of cluster) {
      let set = m.get(word);
      if (!set) {
        set = new Set<string>();
        m.set(word, set);
      }
      for (const sibling of cluster) set.add(sibling);
    }
  }
  return m;
})();

/** Split a query the same way the meaning search does. */
function parse(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Expand search terms with their cluster synonyms. The original terms are
 * always included first; siblings follow, deduped, order-stable.
 */
export function expandTerms(terms: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (w: string) => {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  };
  for (const term of terms) {
    push(term);
    const siblings = INDEX.get(term);
    if (siblings) for (const s of siblings) push(s);
  }
  return out;
}

/**
 * The extra words a query expands to, excluding everything the user typed —
 * for the UI's "also searched" hint. Returns [] for a blank/unknown query.
 */
export function addedSynonyms(query: string): string[] {
  const terms = parse(query);
  const typed = new Set(terms);
  return expandTerms(terms).filter((w) => !typed.has(w));
}
