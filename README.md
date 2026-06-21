# Generator Nama Bayi · Baby Name Generator

A fully client-side baby-name generator that **assembles** names from etymological
roots, composes a **bilingual meaning** (Indonesian + English), and renders the
result into a beautiful, downloadable **frame ("pigura")** you can save as a
**hi-res PNG** or **PDF**. No backend — it runs entirely in the browser and
deploys to GitHub Pages.

## Features

- **Three name styles:**
  - **Umum (Familiar)** — joins **attested given names** (from a ~5,200-name set
    enriched from Lisa Shaw's *Baby Names Your Child Can Live With*) across 12
    origin families into a multi-word name. Meanings are English (the source is
    English-only); the curated core set is fully bilingual.
  - **Unik (Composed)** — assembles a one-of-a-kind name from etymological roots
    (Arab, Sanskerta, Latin, Ibrani), with composed bilingual meanings.
  - **Arti (By meaning)** — *reverse search*: type meaning words (e.g.
    `joy, happy, glee`) and get names whose meaning contains **any** of them.
    Matches are drawn from **both** the attested-name set and the etymology
    roots, comparing against the Indonesian **and** English glosses.
- **12 etymology families** in familiar mode: Arab, Ibrani, Yunani, Latin & Roman,
  Inggris, Keltik, Jermanik, Sanskerta & Hindu, Slavia, Afrika, Pasifik & Asia, Lainnya.
- **Parameters:** surname, gender (Laki-laki / Perempuan / Netral), **number of
  words (2–4)** — e.g. 3 gives a three-word name — plus the initial letter (awalan)
  and etymology. In Composed mode each word is controlled *individually*, so you
  can mix origins across words ("campuran etimologi"). **Leaving an awalan empty
  auto-generates that part.**
- **Origins (v1):** Arab/Islami, Sanskerta & Jawa, Latin/Yunani, Ibrani.
- **Composed meaning** built from each chosen root, shown bilingually.
- **History & no-repeat:** regenerating never repeats a name already shown;
  **Prev/Next** step back and forth through the names you've generated, and
  **Reset** clears the tracked set so you can start over.
- **Four frame styles:** Klasik Elegan, Modern Lembut, Botani, Royal Gelap.
- **Export:** hi-res PNG (3× pixel ratio) and PDF, with self-hosted cursive fonts
  embedded into the export.

> Names are *creatively composed* from etymological roots — they are not a
> dictionary of attested given names.

## Data source

The familiar-name list is enriched with names and short meaning glosses adapted
from *Baby Names Your Child Can Live With* by Lisa Shaw (Adams Media, 2005). Only
brief factual name/meaning data is used; the book's descriptive commentary,
variations, and editorial prose are not included.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # run the Vitest suite (generator, meaning, dataset)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## Architecture

| Area | File(s) |
| --- | --- |
| Types | `src/types.ts` |
| Dataset (roots + meanings) | `src/data/elements.*.json`, merged in `src/data/index.ts` |
| Name assembly | `src/lib/generator.ts` (pure, seeded RNG) |
| Meaning composition | `src/lib/composeMeaning.ts` |
| PNG/PDF export | `src/lib/export.ts` (`html-to-image` + `jsPDF`) |
| UI | `src/components/*` |
| Fonts (self-hosted) | `src/fonts/`, `src/styles/fonts.css` |

The generator and meaning-composition logic are pure functions covered by unit
tests. Adding more names is just appending entries to the JSON files — the
dataset test enforces the schema.

## Deploy (GitHub Pages)

1. Push to `main`. The workflow in `.github/workflows/deploy.yml` runs tests,
   builds, and publishes `dist/` to Pages.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The site is served at `https://<user>.github.io/baby-name-ideas/`.

If you fork to a different repo name, update `base` in `vite.config.ts` to match.
