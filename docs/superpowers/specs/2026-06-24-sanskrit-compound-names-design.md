# Nama leburan Sanskerta/Jawa di mode Unik

**Tanggal:** 2026-06-24
**Status:** Disetujui untuk perencanaan

## Masalah

Nama bergaya Sanskerta/Jawa seperti **"Gunadharma Wijaya Wangsa"** belum bisa
ter-generate, karena dua keterbatasan:

1. **Tidak ada peleburan (fusi).** "Gunadharma" sebenarnya akar *guna* + *dharma*
   yang dilebur jadi satu kata tanpa spasi (pola *samasa*). Generator sekarang
   selalu memisah tiap unsur dengan spasi (`generateName`, `src/lib/generator.ts:94`),
   tidak pernah melebur jadi `Gunadharma`.
2. **Kosakata kurang.** Pool Sanskerta baru 32 akar
   (`src/data/elements.sanskerta.json`). Ada `wijaya`/`jaya`, tapi tidak
   `guna`, `dharma`, maupun `wangsa`.

## Tujuan

Di **mode Unik (composed)**, sediakan saklar yang membuat generator melebur
1–2 akar menjadi satu kata, dan perkaya kosakata Sanskerta/Jawa sehingga nama
bernuansa klasik (mis. *Gunadharma Wijaya Wangsa*) muncul lengkap dengan arti.

**Prinsip kunci:** fusi mengubah *isi* sebuah kata (1–2 akar dilebur), **bukan**
jumlah kata. "3 slot + fusi" tetap menghasilkan 3 kata, sebagian leburan —
persis pola *Gunadharma · Wijaya · Wangsa*.

## Bukan tujuan (non-goals)

- Tidak mengubah mode lain (Familiar, By-meaning, Analyze).
- Tidak menyimpan akar majemuk jadi-jadian (mis. entri `text:"gunadharma"`) di
  data — fusi harus ter-*generate*, bukan di-hardcode.
- Tidak menambah aturan *sandhi* Sanskerta penuh; cukup perapian seam ringan.

## Pendekatan terpilih (A)

Lebur di dalam `generateName` yang sudah ada + tambah field `wordGroups`.
Ditolak: (B) fungsi generator terpisah — menggandakan logika filter/posisi;
(C) akar majemuk di data — tidak generatif, kombinasi meledak.

## Perubahan rinci

### 1. Model data (`src/types.ts`)

```ts
export interface GenerateRequest {
  surname: string;
  gender: Gender;
  slots: SlotConstraint[];
  /** Saat true, tiap slot boleh melebur 1–2 akar jadi satu kata. */
  fuse?: boolean;
}

export interface GeneratedName {
  name: string;
  surname: string;
  elements: NameElement[];
  origins: Origin[];
  /**
   * Jumlah akar per kata. sum(wordGroups) === elements.length.
   * Tidak ada / undefined => tiap elemen adalah satu kata (kompatibel mundur).
   */
  wordGroups?: number[];
}
```

Konsumen lama (`composeMeaning`, `NameFrame`) tetap jalan: tanpa `wordGroups`
perilaku tidak berubah.

### 2. Generator (`src/lib/generator.ts`, `generateName`)

- Membaca `req.fuse`. Untuk tiap slot, tentukan ukuran kata: **1** akar (perilaku
  sekarang) atau **2** akar leburan.
- Saat `fuse` aktif: **jamin ≥1 kata** jadi leburan 2-akar (pilih satu slot yang
  poolnya cukup); slot lain 50/50 (acak deterministik lewat `rng` seed yang ada).
- Saat memilih 2 akar untuk satu kata: akar pertama hindari `position === 'suffix'`,
  akar kedua hindari `position === 'prefix'` (pakai `preferByPosition` yang ada),
  dan akar kedua harus beda `id` dari yang pertama. Jika pool tidak cukup untuk
  fusi, slot itu jatuh kembali ke 1 akar.
- Penggabungan teks per kata: gabung `text` tiap akar berurutan. *Sandhi ringan*:
  bila huruf terakhir akar-1 sama dengan huruf pertama akar-2 dan keduanya vokal,
  buang satu (mis. `wira`+`adi` → `wiradi`). Lalu `cleanup()` yang ada merapikan
  huruf kembar 3+. Hasil di-`capitalize`.
- `name` = daftar kata di-join spasi. `origins` = distinct semua akar.
  `wordGroups` dicatat (mis. `[2,1,1]` untuk *Gunadharma Wijaya Wangsa*).
- Mode tanpa fusi tetap menghasilkan `wordGroups` semua-1 (atau dibiarkan
  undefined) — keduanya valid.

### 3. Komposisi arti (`src/lib/composeMeaning.ts`)

- Jika `wordGroups` ada dan memuat grup > 1: potong `g.elements` menjadi kata-kata
  sesuai `wordGroups`. Di dalam satu kata, gabung arti tiap akar dengan `-`,
  ambil **makna pertama** (teks sebelum koma) agar rapi
  (mis. `guna`="kebajikan, kebaikan" → "kebajikan"). Antar-kata tetap ` · `.
- Tanpa `wordGroups` (atau semua-1): perilaku lama (tiap elemen di-join ` · `).
- Berlaku untuk kedua bahasa (`id` dan `en`) secara konsisten.

Contoh keluaran *Gunadharma Wijaya Wangsa*:
- ID: `Kebajikan-kebenaran · Kemenangan · Keturunan, dinasti`
- EN: `Virtue-righteousness · Victory · Lineage, dynasty`

(Catatan: `wangsa` adalah kata ber-akar-tunggal sehingga mempertahankan gloss
penuh `keturunan, dinasti`; hanya kata leburan seperti `Gunadharma` yang
diringkas ke makna pertama.)

### 4. Kosakata (`src/data/elements.sanskerta.json`)

Tambah **~80+ akar** Sanskerta/Jawa bilingual (dari 32 → ~110+), masing-masing
dengan `id`, `text`, `initial`, `origin: "sanskerta"`, `gender`, `meaning.{id,en}`,
dan `position` bila relevan. Wajib termasuk akar pada contoh: **guna, dharma
(darma), wangsa** (plus `wijaya`/`jaya` yang sudah ada).

Daftar kandidat (final dikurasi saat implementasi): guna, dharma, wangsa, arta,
cipta, karsa, nata, prabu, raden, sena, teja, sakti, wibawa, agung, mulia,
sentosa, lestari, dirga, kusuma, ayu, seta, eka, dwi, tri, catur, panca, sapta,
asta, bagas/bagus, manggala, krida, baskara, aditya, bhumi, samudra, giri,
angkasa, jagat, buana, wening, tentrem, raharja, makmur, sembada, widya, jnana,
gana, bayu, agni, warih, bratha, satria, wisesa, adhi, atma, parameswara, kanaka,
ratih, kumala, larasati, gandara, dst. (Target ~80 baru; finalisasi di rencana
implementasi, perhatikan tidak menduplikasi 32 akar yang ada.)

### 5. UI (`src/components/ParameterForm.tsx` + `src/App.tsx`)

- Tambah saklar **"Lebur jadi satu kata · Fuse into one word"**, **hanya tampil
  saat mode Unik (composed)**. Pola UI mengikuti toggle `sameOrigin` yang ada.
- State form menyimpan `fuse: boolean`. `App.runGenerator` meneruskannya ke
  `GenerateRequest.fuse` saat memanggil `generateName`.

### 6. Tes (`tests/`)

- `generateName` dengan seed tetap + `fuse: true`:
  - menghasilkan minimal satu kata leburan (`wordGroups` memuat nilai 2;
    jumlah spasi pada `name` < jumlah elemen − 1 saat ada fusi);
  - seam sandhi & `cleanup` benar (mis. tak ada vokal kembar di sambungan);
  - position hint dihormati (akar pertama bukan suffix, kedua bukan prefix).
- `generateName` tanpa `fuse`: perilaku lama tidak berubah.
- `composeMeaning`: pengelompokan per-kata + pengambilan makna-pertama benar,
  dan tetap kompatibel saat `wordGroups` undefined.

## Risiko & mitigasi

- **Seam jelek** (mis. konsonan bertumpuk aneh): dibatasi dengan sandhi vokal
  ringan + `cleanup`; akar dikurasi agar enak dilebur. Tidak mengejar sandhi penuh.
- **Pool terlalu kecil untuk fusi** pada filter ketat: slot jatuh balik ke 1 akar,
  tidak error.
- **Arti jadi panjang**: diatasi dengan mengambil makna pertama tiap akar dalam
  kata leburan.

## Berkas yang tersentuh

- `src/types.ts` — `fuse`, `wordGroups`.
- `src/lib/generator.ts` — logika fusi di `generateName`.
- `src/lib/composeMeaning.ts` — pengelompokan per-kata.
- `src/data/elements.sanskerta.json` — ~80+ akar baru.
- `src/components/ParameterForm.tsx`, `src/App.tsx` — saklar + wiring.
- `tests/` — tes generator & composeMeaning.
