# Generator Nama Bayi · Baby Name Generator

A fully client-side baby-name generator that **assembles** names from etymological
roots, composes a **bilingual meaning** (Indonesian + English), and renders the
result into a beautiful, downloadable **frame ("pigura")** you can save as a
**hi-res PNG** or **PDF**. No backend — it runs entirely in the browser and
deploys to GitHub Pages.

## Features

- **Parameters:** surname, gender (Laki-laki / Perempuan / Netral), number of
  syllables (2–4), and *per-syllable* control of the initial letter (awalan) and
  etymology — so you can mix origins across syllables ("campuran etimologi").
- **Origins (v1):** Arab/Islami, Sanskerta & Jawa, Latin/Yunani, Ibrani.
- **Composed meaning** built from each chosen root, shown bilingually.
- **Four frame styles:** Klasik Elegan, Modern Lembut, Botani, Royal Gelap.
- **Export:** hi-res PNG (3× pixel ratio) and PDF, with self-hosted cursive fonts
  embedded into the export.

> Names are *creatively composed* from etymological roots — they are not a
> dictionary of attested given names.

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
