#!/usr/bin/env node
/**
 * Generates src/data/islamicNames.json from the curated list below.
 * Computes id / initial / syllables so the JSON satisfies the CommonName schema.
 *
 * Run: node scripts/build-islamic.mjs
 *
 * Each row: [name, origin, gender, meaning.id, meaning.en]
 *   origin: 'arab' (Arabic/Islamic sphere)
 *   gender: 'L' (male) | 'P' (female)
 * Names with Islamic resonance: prophets (Arabic forms), companions (sahabah),
 * Asma'ul-Husna-derived virtue names, and common Indonesian-Muslim given names.
 * Meanings are brief, widely-attested glosses.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROWS = [
  // ---- Prophets (Arabic forms) — men ----
  ['Adam', 'arab', 'L', 'manusia pertama', 'the first man'],
  ['Idris', 'arab', 'L', 'nabi yang pandai', 'the learned prophet'],
  ['Nuh', 'arab', 'L', 'Nabi Nuh', 'the prophet Noah'],
  ['Hud', 'arab', 'L', 'nama seorang nabi', "a prophet's name"],
  ['Saleh', 'arab', 'L', 'saleh, baik', 'pious, righteous'],
  ['Ibrahim', 'arab', 'L', 'bapak banyak bangsa', 'father of nations'],
  ['Ismail', 'arab', 'L', 'Tuhan mendengar', 'God hears'],
  ['Ishaq', 'arab', 'L', 'tawa', 'laughter'],
  ['Yaqub', 'arab', 'L', 'yang mengikuti', 'he who follows'],
  ['Yusuf', 'arab', 'L', 'Tuhan menambahkan', 'God increases'],
  ['Ayyub', 'arab', 'L', 'yang kembali kepada Tuhan', 'one who returns to God'],
  ['Musa', 'arab', 'L', 'diselamatkan dari air', 'saved from the water'],
  ['Harun', 'arab', 'L', 'gunung, tinggi', 'mountain, exalted'],
  ['Ilyas', 'arab', 'L', 'Tuhan adalah Tuhanku', 'the Lord is my God'],
  ['Yunus', 'arab', 'L', 'merpati', 'dove'],
  ['Zakaria', 'arab', 'L', 'Tuhan mengingat', 'God remembers'],
  ['Yahya', 'arab', 'L', 'yang hidup', 'living'],
  ['Isa', 'arab', 'L', 'Nabi Isa', 'the prophet Jesus'],
  ['Dawud', 'arab', 'L', 'yang dikasihi', 'beloved'],
  ['Sulaiman', 'arab', 'L', 'damai sejahtera', 'peaceful'],
  ['Luqman', 'arab', 'L', 'bijaksana', 'the wise'],
  ['Zulkifli', 'arab', 'L', 'nama seorang nabi', "a prophet's name"],
  // ---- Companions & early figures (sahabah) — men ----
  ['Muhammad', 'arab', 'L', 'yang terpuji', 'the praised one'],
  ['Ahmad', 'arab', 'L', 'yang sangat terpuji', 'most praiseworthy'],
  ['Mahmud', 'arab', 'L', 'yang dipuji', 'praised'],
  ['Umar', 'arab', 'L', 'panjang umur, makmur', 'long-lived, flourishing'],
  ['Usman', 'arab', 'L', 'nama sahabat Nabi', "a companion of the Prophet"],
  ['Ali', 'arab', 'L', 'tinggi, mulia', 'high, exalted'],
  ['Hamzah', 'arab', 'L', 'singa, kuat', 'lion, strong'],
  ['Khalid', 'arab', 'L', 'abadi, kekal', 'eternal'],
  ['Bilal', 'arab', 'L', 'air, kesegaran', 'moisture, freshness'],
  ['Salman', 'arab', 'L', 'selamat, aman', 'safe, peaceful'],
  ['Zaid', 'arab', 'L', 'pertumbuhan, kelimpahan', 'growth, abundance'],
  ['Saad', 'arab', 'L', 'keberuntungan', 'good fortune'],
  ['Anas', 'arab', 'L', 'keramahan, kasih sayang', 'friendliness, affection'],
  ['Muadz', 'arab', 'L', 'yang terlindungi', 'protected'],
  ['Yasir', 'arab', 'L', 'kemudahan, kemakmuran', 'ease, wealth'],
  ['Ammar', 'arab', 'L', 'berumur panjang', 'long-lived'],
  ['Faruq', 'arab', 'L', 'pembeda benar dan salah', 'one who distinguishes truth'],
  // ---- Virtue / Asma'ul-Husna-derived & common Muslim names — men ----
  ['Karim', 'arab', 'L', 'mulia, dermawan', 'noble, generous'],
  ['Rahman', 'arab', 'L', 'maha pengasih', 'the most compassionate'],
  ['Rasyid', 'arab', 'L', 'yang lurus, bijak', 'rightly guided'],
  ['Hakim', 'arab', 'L', 'bijaksana', 'wise'],
  ['Aziz', 'arab', 'L', 'mulia, perkasa', 'mighty, dear'],
  ['Hafiz', 'arab', 'L', 'penjaga, penghafal', 'guardian, keeper'],
  ['Amin', 'arab', 'L', 'yang terpercaya', 'trustworthy'],
  ['Iman', 'arab', 'L', 'keimanan', 'faith'],
  ['Fauzan', 'arab', 'L', 'kemenangan, keberhasilan', 'success, salvation'],
  ['Rizki', 'arab', 'L', 'rezeki, karunia', 'sustenance, blessing'],
  ['Hidayat', 'arab', 'L', 'petunjuk', 'guidance'],
  ['Taufik', 'arab', 'L', 'pertolongan Tuhan', 'divine guidance'],
  ['Ridwan', 'arab', 'L', 'keridaan, penjaga surga', 'divine pleasure'],
  ['Nabil', 'arab', 'L', 'mulia, cerdas', 'noble, intelligent'],
  ['Faisal', 'arab', 'L', 'penengah, tegas', 'decisive'],
  ['Fadhil', 'arab', 'L', 'utama, berbudi', 'virtuous'],
  ['Hasan', 'arab', 'L', 'baik, tampan', 'good, handsome'],
  ['Husain', 'arab', 'L', 'yang baik', 'the good one'],
  ['Ihsan', 'arab', 'L', 'kebaikan', 'excellence, benevolence'],
  ['Irfan', 'arab', 'L', 'pengetahuan, kearifan', 'knowledge, wisdom'],
  ['Arif', 'arab', 'L', 'bijaksana, mengetahui', 'wise, knowing'],
  ['Syakir', 'arab', 'L', 'yang bersyukur', 'grateful'],
  ['Najib', 'arab', 'L', 'mulia, terhormat', 'noble'],
  ['Latif', 'arab', 'L', 'lembut, halus', 'gentle, kind'],
  ['Munir', 'arab', 'L', 'yang bercahaya', 'radiant'],
  ['Anwar', 'arab', 'L', 'lebih bercahaya', 'more radiant'],
  ['Wafi', 'arab', 'L', 'yang setia', 'faithful'],
  ['Fikri', 'arab', 'L', 'pemikiran, cerdas', 'intellect, thoughtful'],
  ['Zaki', 'arab', 'L', 'suci, cerdas', 'pure, intelligent'],
  ['Rafi', 'arab', 'L', 'tinggi, mulia', 'high, exalted'],
  ['Syamil', 'arab', 'L', 'menyeluruh, sempurna', 'comprehensive, complete'],
  // ---- Companions & noble women ----
  ['Aisyah', 'arab', 'P', 'yang hidup, ceria', 'living, lively'],
  ['Fatimah', 'arab', 'P', 'yang menjauhkan diri', 'one who abstains'],
  ['Khadijah', 'arab', 'P', 'yang lahir lebih awal', 'early born'],
  ['Maryam', 'arab', 'P', 'yang dikasihi', 'beloved'],
  ['Hajar', 'arab', 'P', 'ibunda Nabi Ismail', 'mother of the prophet Ismail'],
  ['Zainab', 'arab', 'P', 'pohon yang harum dan indah', 'fragrant flowering tree'],
  ['Hafsah', 'arab', 'P', 'singa betina muda', 'young lioness'],
  ['Ruqayyah', 'arab', 'P', 'naik, lembut', 'ascent, gentle'],
  ['Sumayyah', 'arab', 'P', 'yang tinggi, mulia', 'lofty, high'],
  ['Asma', 'arab', 'P', 'mulia, tinggi', 'lofty, noble'],
  ['Halimah', 'arab', 'P', 'lembut, sabar', 'gentle, patient'],
  ['Maimunah', 'arab', 'P', 'yang diberkati', 'blessed'],
  ['Safiyyah', 'arab', 'P', 'murni, sahabat tulus', 'pure, sincere friend'],
  // ---- Virtue / common Muslim names — women ----
  ['Nur', 'arab', 'P', 'cahaya', 'light'],
  ['Aida', 'arab', 'P', 'yang kembali, hadiah', 'returning, reward'],
  ['Nadia', 'arab', 'P', 'lembut, pemurah', 'tender, generous'],
  ['Salma', 'arab', 'P', 'selamat, damai', 'safe, peaceful'],
  ['Yasmin', 'arab', 'P', 'bunga melati', 'jasmine flower'],
  ['Laila', 'arab', 'P', 'malam', 'night'],
  ['Zahra', 'arab', 'P', 'berseri, bunga', 'radiant, flower'],
  ['Huda', 'arab', 'P', 'petunjuk', 'guidance'],
  ['Sakinah', 'arab', 'P', 'ketenangan', 'tranquility'],
  ['Hana', 'arab', 'P', 'kebahagiaan', 'happiness, bliss'],
  ['Amira', 'arab', 'P', 'putri, pemimpin', 'princess, leader'],
  ['Karima', 'arab', 'P', 'mulia, dermawan', 'noble, generous'],
  ['Latifah', 'arab', 'P', 'lembut, halus', 'gentle, kind'],
  ['Rahma', 'arab', 'P', 'kasih sayang', 'mercy, compassion'],
  ['Hikmah', 'arab', 'P', 'kebijaksanaan', 'wisdom'],
  ['Najwa', 'arab', 'P', 'bisikan mesra, doa', 'intimate talk, confiding'],
  ['Naila', 'arab', 'P', 'yang memperoleh', 'one who attains'],
  ['Syifa', 'arab', 'P', 'kesembuhan', 'healing'],
  ['Inayah', 'arab', 'P', 'perlindungan Tuhan', 'care, divine protection'],
  ['Hamida', 'arab', 'P', 'yang memuji', 'praiseworthy'],
  ['Aliyah', 'arab', 'P', 'tinggi, mulia', 'exalted, sublime'],
  ['Zahira', 'arab', 'P', 'berseri, jelas', 'radiant, evident'],
  ['Nabila', 'arab', 'P', 'mulia, cerdas', 'noble, intelligent'],
  ['Faizah', 'arab', 'P', 'yang menang, sukses', 'victorious, successful'],
  ['Jamila', 'arab', 'P', 'cantik', 'beautiful'],
  ['Wardah', 'arab', 'P', 'bunga mawar', 'rose'],
  ['Balqis', 'arab', 'P', 'ratu Saba', 'Queen of Sheba'],
  ['Anisa', 'arab', 'P', 'ramah, lembut', 'friendly, gentle'],
  ['Azizah', 'arab', 'P', 'mulia, perkasa', 'mighty, dear'],
  ['Hayat', 'arab', 'P', 'kehidupan', 'life'],
  ['Afifah', 'arab', 'P', 'suci, terjaga', 'chaste, virtuous'],
  ['Rania', 'arab', 'P', 'yang menatap dengan kagum', 'gazing, captivating'],
  ['Sofia', 'arab', 'P', 'kebijaksanaan', 'wisdom'],
];

function syllables(name) {
  const groups = name.toLowerCase().match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

// Dedupe rows by name+gender.
const seen = new Set();
const out = [];
for (const [name, origin, gender, id, en] of ROWS) {
  const key = `${name.toLowerCase()}|${gender}`;
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({
    id: `isl-${name.toLowerCase()}-${gender.toLowerCase()}`,
    name,
    initial: name[0].toLowerCase(),
    syllables: syllables(name),
    origin,
    gender,
    meaning: { id, en },
    islamic: true,
  });
}

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'src', 'data', 'islamicNames.json');
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${out.length} islamic names to ${file}`);
