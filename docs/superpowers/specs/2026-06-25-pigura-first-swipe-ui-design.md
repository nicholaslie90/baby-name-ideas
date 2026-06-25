# Pigura-first, swipe-driven UI — Design

Date: 2026-06-25

## Goal

Make the name generator a focused, front-and-center experience: the main view
shows **only the pigura (name frame)**, with Tinder-style left/right swipe on
mobile and no vertical or horizontal scroll. All controls and parameters move
into a single customization modal opened by one button.

## Motivation

The current layout puts a parameter form, frame-style switcher, font switcher,
nav arrows, counter, regenerate/reset icons, export buttons, header, and footer
all on screen at once. This is distracting and pushes the actual result (the
pigura) out of focus. The redesign strips the main view down to the card so the
experience is immediate.

## Main view — pigura only, full viewport, no scroll

- The app becomes a single centered "deck" filling the viewport: `height: 100dvh`,
  `overflow: hidden`, flex-centered. No header, subtitle, footer, side form, or
  scroll in either axis.
- The pigura card is sized so the full 480×600 frame always fits without
  overflow. Width is constrained by both viewport width and available height,
  e.g. `width: min(480px, 92vw, calc(0.8 * (100dvh - <chrome>)))` (the 0.8 comes
  from the frame's 480/600 aspect ratio). Exact values tuned during
  implementation so nothing clips top/bottom or left/right on common phones.
- `NameFrame` and its `NameFrame.module.css` container-query sizing are reused
  unchanged — only the wrapper that sizes/positions it changes.

## Swipe & navigation

Swipe semantics (confirmed with user):

- **Swipe right** → new name (advance: generate next, same as current "next").
- **Swipe left** → previous name in history (same as current "prev"); no-op when
  already at the first name.

Behavior:

- Mobile/touch: drag the card via pointer events; the card follows the pointer
  with a slight rotation (Tinder-style tilt). On release past a horizontal
  distance/velocity threshold, the card animates off-screen in the drag
  direction, then the next/previous name is shown. Below threshold it springs
  back to center.
- Desktop: same right=new / left=back via slim translucent `‹` / `›` arrows
  overlaid on the card's left/right edges, plus keyboard `ArrowLeft` /
  `ArrowRight`.
- `prefers-reduced-motion`: skip the fly-off/spring animation and switch names
  immediately.
- Implemented as a small hand-rolled swipe hook using pointer events — **no new
  dependency**.

## Customization modal

- A single small floating button (⚙) in a corner of the main view opens a
  centered modal dialog: backdrop overlay, closes on Esc / backdrop click / a
  close button, focus moved into the dialog on open and restored on close,
  `role="dialog"` + `aria-modal="true"`.
- The modal contains everything previously scattered on the result side:
  - The full **ParameterForm** (name style, surname, gender, word count,
    per-mode inputs — familiar initial/origins/category, meaning query, composed
    per-word slots + fuse, analyze name input — and the same-origin toggle).
  - **FrameStyleSwitcher** and **NameFontSwitcher**.
  - **ExportButtons** (PNG / PDF) and the **Reset** action.
- Changes apply live to the card behind the modal. The existing `filterSig`
  effect in `App.tsx` already auto-regenerates when a filter changes, so this
  needs no new wiring beyond moving the controls.

## Nama Sendiri (analyze) mode

- This mode has no history/swipe: the displayed name is derived live from the
  typed name plus per-word candidate selections.
- **WordCandidateChips** move into the modal, directly under the name input, so
  the main view stays "card only" consistently across all modes. The card still
  updates live as candidates are picked.
- Swipe and nav arrows are disabled/hidden in analyze mode.

## Removed from the main view

Title, subtitle, footer, the `position` counter ("3 / 5"), and the visible
regenerate/reset icons. Regenerate is now expressed by swipe-right; reset lives
in the modal.

## State ownership changes

- Frame `style` and `nameFont` currently live as local state inside
  `ResultPanel`. Since the switchers move to the modal but the card renders on
  the main view, these lift up to `App` (or a shared parent) so both the modal
  controls and the main-view card read the same values.
- A new `modalOpen` boolean state controls the dialog.
- History/cursor logic, `generate`, `goPrev`, `goNext`, `reset`, and `filterSig`
  in `App.tsx` are reused as-is; swipe-right calls the same path as `goNext`,
  swipe-left the same as `goPrev`.

## Components

- **`Deck`** (new): full-viewport container that renders the current card,
  handles swipe via the hook, renders desktop arrows, and shows the ⚙ button.
- **`useSwipe`** (new hook): pointer-event drag tracking → returns drag offset
  + commit/cancel callbacks; honors `prefers-reduced-motion`.
- **`Modal`** (new): accessible dialog wrapper (overlay, focus trap, Esc/backdrop
  close).
- **`CustomizationPanel`** (new or refactor of current `ResultPanel` tail):
  hosts ParameterForm + switchers + export + reset + (analyze) chips inside the
  modal.
- **`ResultPanel`** is reduced/retired: its card-rendering role moves to `Deck`;
  its control-hosting role moves to `CustomizationPanel`.
- `NameFrame`, `ParameterForm`, `FrameStyleSwitcher`, `NameFontSwitcher`,
  `ExportButtons`, `WordCandidateChips` are reused; only their placement changes.

## Testing

- Existing logic tests (generator, analyze, meaning, synonyms, dataset, etc.)
  are unaffected.
- Component/interaction tests that assert on placement need updating:
  - `resultPanelCandidates.test.tsx` and `wordCandidateChips.test.tsx`: chips now
    render inside the opened modal — tests open the modal first.
  - `parameterForm.fuse.test.tsx`, `categoryChips.test.tsx`, `meaningHint.test.tsx`,
    `app.words.test.tsx`: locate the form inside the modal where applicable.
- New tests:
  - Swipe-right advances to a new name; swipe-left returns to the previous;
    swipe-left at the first name is a no-op (can drive via keyboard ←/→ or arrow
    buttons in jsdom, since real touch isn't available).
  - Modal opens via the ⚙ button and closes via Esc/backdrop/close button.
  - Main view renders only the card + minimal chrome (no header/footer/counter).

## Out of scope

- No "save/favorites" feature (swipe-right is "new", not "like").
- No new gesture/animation libraries.
- No changes to name-generation logic or datasets.
