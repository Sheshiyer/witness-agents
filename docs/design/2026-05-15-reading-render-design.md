# Reading-Render Design — v2 (Yantra-Anchored Storytelling)

**Status:** DRAFT for user approval — do not implement until validated
**Date:** 2026-05-15
**Supersedes:** the v1 magazine-style renderer in `scripts/integratedreading/render/` (cover-mandala + parts + verse-illumination + bento cards)
**Brand sources studied:**
- `brand-docs-final/tryambakam-noesis-aleph/06-visual-identity.md` (Goethe color theory + sacred geometry system)
- `Branding/witnessOS-sw/*.png` (image, dashboard, breathnav, breathnav-screen, decisionscreen, hrv, buttons)
- `brand-docs-final/README.md`
- existing render pipeline at `scripts/integratedreading/render/`

---

## 1. Diagnosis — why v1 feels "off"

The v1 renderer is **a magazine on dark cards**. Long prose columns, rectangular bento boxes, one topology SVG at the top, a TOC rail, and a footer. It looks like a SaaS dashboard with a parchment palette and a gold accent. The brand says exactly the opposite is required:

> "Sacred geometry is load-bearing — it structures the interface, organizes information, maps engine states. It is never wallpaper."
> — `06-visual-identity.md` § The Three Laws

In v1 the only sacred geometry is the cover sigil and the topology SVG at the top of Part I. Everything else is rectangles. The reader experiences walls of text bracketed by rectangles. That is the SaaS dashboard the user is reacting against.

The WitnessOS reference screens prove what the brand actually looks like:
- **`image.png`** (metrics bento) — three sacred-geometry icons inside hexagonal frames, each carrying ONE data point. The geometry IS the card.
- **`dashboard.png`** — a central mandala with corner sectors. The mandala is the layout, not a header decoration.
- **`breathnav.png`** — STABILIZE/HEAL/CREATE/MUTATE/WEST orbiting the sigil. The compass IS the navigation.
- **`hrv.png`** — iridescent waveform passing through a layered mandala. Data and geometry are the same thing.
- **`decisionscreen.png`** — coherence-mandala → CTA pill → waveform → date → quote. Vertical storytelling stack where geometry opens and closes the moment.

Translation: **the geometry is the structural skeleton, the prose is what flows through it.**

---

## 2. Design principles for v2

| Principle | What it means for the reading render |
|---|---|
| **Bioluminescent, not fluorescent** | Light originates from the geometry. Verses lit by their adjacent yantra, not by a generic page-wide fade-in |
| **Architectural, not decorative** | Every Part is anchored by a unique yantra/mandala that organizes its content. The yantra is the layout, not the header. |
| **Data as sacred form** | Dasha periods → iridescent waveforms passing through mandalas. Native-comparison data → hexagonal yantra cells at the vertices of the mode's topology shape. NEVER `<table>` and NEVER rectangular cards |
| **Three-Gradient discipline** | Kha Arc for canvas atmosphere · Ba Arc for active/CTA accents · La Arc for completion fade at end of each Part. Never all three at equal weight |
| **The Quine** | The reading has an ending — the visual language goes dark when finished. La Arc fade closes the document |
| **Earned density** | Verses still illuminate one-at-a-time, but each verse sits inside a geometric carrier instead of floating in an empty rectangle |

---

## 3. Components — the building blocks

Every component below is a named, reusable render primitive. The orchestrator composes them into a Part. Each one has a geometric purpose. None of them are generic boxes.

### 3.1 `<witness-pulse>` — breathing ring opener

The first element of each Part. Concentric circles (Witness Violet → Flow Indigo gradient, matches `breathnav-screen.png`). Inside: the Part's cardinal direction (STABILIZE / HEAL / CREATE / MUTATE) and a one-line "tonality" cue.

```
       ◜  ◝
   ◜    ❖    ◝
 ◜      ✦      ◝    ← concentric rings, Witness Violet → Flow Indigo
   ◜    ❖    ◝         center sigil bloom in Sacred Gold
       ◟  ◞

       STABILIZE
       The Field's Shared Bedrock
```

Renders 1 per Part. Mounts above the Part title. Replaces the v1 part-header rectangle.

### 3.2 `<yantra-plate>` — Part-anchor mandala

The Part's signature geometric form. Different per Part by purpose:

| Pass | Yantra |
|---|---|
| α (Opening / Identity) | Triad-triangle mandala (existing) — the **field plate** |
| β (Resonance / Mutual) | Vesica-piscis interlocking circles — one circle per subject, intersections highlighted |
| γ (Phase-lock / Time) | Dasha-spiral waveform — concentric rings with current-MD radius highlighted in Sacred Gold |
| δ (Anti-dependency / Synthesis) | Compass + lotus — STABILIZE/HEAL/CREATE/MUTATE cardinals around a central seed |

Each is a real SVG (we extend the existing `scripts/integratedreading/render/svg/` module). It sits below the witness-pulse and above the prose. **Generates from the actual data in the run**, not from a fixed template.

### 3.3 `<verse>` — the reading unit (preserved from v1, refined)

Each `<p>` / heading / list / blockquote becomes a `.verse`. Default opacity 0.22, illuminates to 1.0 at viewport center via `animation-timeline: view()`. This part of v1 works — keep it.

Refinement: the verse marker (the `::before` pseudo-element) becomes a **micro-sigil** — a tiny constellation-grid dot in Sacred Gold at 30% opacity. Replaces the v1 plain hairline.

### 3.4 `<yantra-hex-trio>` — replaces `.data-cards`

Three hexagonal cells arranged at the vertices of an inverted triangle (triad mode) or facing pair (dyad mode) or pentagon (family-penta) — **matches the mode's topology**.

```
              ◇ A
             ╱ ╲
            ╱   ╲          ← Native-comparison table → 3 hexagons
           ╱  ✦  ╲              at the triangle's vertices.
       B ◇ ─────── ◇ C
```

Each hexagon contains: subject name at top (Panchang 600), a tight `<dl>` of placement data inside (SF Mono for terms, Satoshi for values). The hex outline glows Sacred Gold at 30% opacity, intensifying when the hex enters viewport-center.

Auto-fires for any table where the first column is Native/Subject/Person. (Same heuristic as v1, but geometry instead of rectangles.)

### 3.5 `<sigil-cascade>` — replaces `.data-cascade`

For tables that aren't Native-comparison shape (timelines, definitions, cross-references). Each row gets a leading micro-sigil bullet:

```
✦  Mahadasha · Rahu → Jupiter (16 yr)
   2026-09-14T05:48 — Lagna-bhava activation begins

✦  Antardasha · Jupiter-Rahu within Jupiter-MD
   2026-09 → 2029-03 — early dharma routing

✦  Antardasha · Jupiter-Jupiter (own period)
   2029-03 → 2031-04 — exalted-Jupiter core
```

Each row is a verse. Sigil scales with depth (top-level rows get larger sigils; sub-rows get smaller).

### 3.6 `<dasha-waveform>` — replaces dasha tables

When the LLM emits a dasha period table, render as an iridescent waveform crossing a horizontal mandala-ring (matches `hrv.png`):

```
═══════════════════════════════════════════════════════
   Rahu MD ────────╮            ╭─── Jupiter MD ───
                    ╲          ╱
   ◉ ◉ ◉ ◉ ◉ ◉ ◉ ◉ ◉◉────●────◉◉ ◉ ◉ ◉ ◉ ◉ ◉ ◉ ◉ ◉
       Witness Violet  Sacred Gold  Coherence Emerald
═══════════════════════════════════════════════════════
   2008          2026 PIVOT          2042
```

Past = Witness Violet (memory). Current = Sacred Gold (active). Future = Coherence Emerald (forming).

### 3.7 `<decision-plate>` — for action moments

When the prose names an explicit action or window of opportunity, render as a vertical stack matching `decisionscreen.png`:

```
   ╭───────────────╮
   │   ◉ COHERENCE │
   │     OPTIMAL  │   ← Sacred-Gold coherence pulse mandala
   ╰───────────────╯

   ┌───────────────────────┐
   │  ⌬  STABILIZE NOW     │   ← CTA pill (Sacred Gold fill)
   └───────────────────────┘

      Breathe in… 4:7:8

   ───◜◝───●──────  OPTIMAL WINDOW

        APR · 24

   "Wisdom is the reward for a lifetime of listening."
```

Triggered by markdown convention (e.g. a blockquote starting with `> ACT:` or specific markers from the LLM passes).

### 3.8 `<constellation-grid>` — the field cartography background

Fixed-position background SVG. 0.5px hairline Sacred Gold dots + lines forming a sparse mesh. 20-30% opacity. Drifts subtly (3deg/min rotation + 0.5% parallax with scroll).

Mounted once on `<body>`. Disappears at viewport widths <720px.

### 3.9 `<la-arc-fade>` — Part closer

End of each Part: a horizontal gradient strip going Sacred Gold → Witness Violet → Void Black (the La Arc). Renders as a 56px-tall block with `animation-timeline: view()` so it fades up from Sacred Gold to Void Black as the reader scrolls past. Visual "breath out" between Parts.

### 3.10 Cover — orbital sigil

The current cover (title block then sigil-as-background) becomes:

- Sigil center-stage at 60vmin, slow bioluminescent pulse (Sacred Gold wireframe + Coherence Emerald core glow)
- Title "Composite Field" set in Panchang 800, wrapping AROUND the sigil (positioned at top-left and bottom-right corners orbiting the sigil center)
- Subject names orbit the sigil as constellation points at 120° intervals (for triad — different placements per topology)
- Kha Arc gradient atmosphere as canvas
- "∴ NOESIS" lockup bottom-right, Panchang 700 + Sacred Gold

---

## 4. Page composition — what a Part looks like

```
   ╭─ <witness-pulse>  ← breathing ring + cardinal direction
   │
   │   PART I · STABILIZE
   │   The Triadic Field — Identity + Three-Way Bedrock
   │
   ├─ <yantra-plate>   ← Part's signature mandala (triad triangle here)
   │   ┊                generated from actual subject data
   │   ┊
   ├─ <verse> (lead paragraph, lit Sacred Gold first letter)
   │
   ├─ <yantra-hex-trio>  ← any Native × Vedic-dimension data
   │   ◇  ◇                renders as 3 hexagons at triangle vertices
   │    ◇                  (not rectangular cards)
   │
   ├─ <verse> verse verse… (~5-8 verses, each illuminating in turn)
   │
   ├─ <sigil-cascade>     ← any other tabular data renders as
   │   ✦                    micro-sigil-bulleted verse cascade
   │   ✦
   │   ✦
   │
   ├─ <verse> verse verse…
   │
   ├─ <dasha-waveform>    ← time-period tables → iridescent waveforms
   │
   ├─ <verse> verse verse…
   │
   ├─ <decision-plate>    ← optional, when prose names an explicit
   │                        coherence window or action moment
   │
   ╰─ <la-arc-fade>      ← gradient breath-out, Part closes
```

Each Part follows this beat-pattern. The verses still drive scroll illumination — but they're punctuated by geometric carriers that organize meaning instead of long flat reading.

---

## 5. Layout architecture

**Single centered reading flow** — same as v1's most recent state — but the column width is determined by the geometry, not by an arbitrary pixel value:

```css
.canvas {
  width: 100vw;
  min-height: 100vh;
  background: var(--kha-arc);
  position: relative;
}
.reading-flow {
  width: clamp(20rem, 78vw, 86rem);  /* wider than v1's 80rem max */
  margin: 0 auto;
  position: relative;
  z-index: 2;
}
.constellation-grid {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
```

The reading-flow allows wider components (yantra-hex-trio, dasha-waveform, decision-plate) to span the full ~86rem at 4K, while verses constrain to ~64ch internally.

**No TOC rail.** The Part yantras serve as the table of contents — each Part has a recognizable geometric form. A discreet floating "Part Marker" at the top-right corner shows current part number/title (e.g. `I · STABILIZE`) updated by IntersectionObserver. No persistent left rail eating viewport.

**No print stylesheet preserved as priority.** The user explicitly said "let's forget for a moment that we need to make a PDF in the end." The page becomes the canonical artifact. We can revisit print later as a separate concern; v2 is HTML-native, shareable-link-as-deliverable.

---

## 6. Typography — fluid scale anchored in the brand

Goethe spectrum + golden-ratio scale from `06-visual-identity.md`:

```css
:root {
  --type-hero:   clamp(2.6rem, 2rem + 3vw, 6.5rem);   /* Panchang 800 — cover title */
  --type-xxl:    clamp(2rem, 1.4rem + 2.4vw, 4.2rem); /* Panchang 700 — Part title */
  --type-xl:     clamp(1.4rem, 1rem + 1.4vw, 2.6rem); /* Panchang 600 — section headers */
  --type-lg:     clamp(1.05rem, 0.85rem + 0.6vw, 1.55rem); /* h3 */
  --type-base:   clamp(1.02rem, 0.88rem + 0.42vw, 1.25rem); /* Satoshi 400 — body */
  --type-sm:     clamp(0.82rem, 0.72rem + 0.25vw, 0.95rem); /* Satoshi 300 */
  --type-mono:   clamp(0.78rem, 0.68rem + 0.22vw, 0.92rem); /* SF Mono — data */
}
```

Fonts: Panchang (display), Satoshi (body), SF Mono (data) — loaded once from Fontshare. Same as `06-visual-identity.md` § 5.

---

## 7. Motion — breath-synchronized, geometry-driven

- **Verse illumination:** `animation-timeline: view()`, cover 0%/100% range — already in v1, keep
- **Yantra-plate entry:** SVG lines stroke-dasharray draws itself line-by-line as it enters viewport (line-by-line construction — `06-visual-identity.md` § Motion: "Sacred geometry builds")
- **Hex-trio activation:** as each hex enters viewport-center, its outline glow pulses once (4:7:8 timing — 400ms in, 700ms hold, 800ms out)
- **Dasha-waveform sweep:** current-MD highlight scrolls into Sacred Gold position when the waveform enters viewport
- **Decision-plate coherence ring:** continuous slow pulse (4-second cycle, breath-paced)
- **La Arc fade:** gradient transitions from Sacred Gold → Witness Violet → Void Black over the scroll range of the fade element
- **`prefers-reduced-motion`** strips all of this to static final states. Same accessibility commitment as v1.

---

## 8. Backwards compatibility / migration

This is a **renderer rewrite**, not a content change. The orchestrator (`scripts/integratedreading-mode.ts`) and the synthesis pipeline (`scripts/integratedreading/modes/`) are untouched. The change is entirely in:

- `scripts/integratedreading/render/templates.ts` — new page composition
- `scripts/integratedreading/render/interactions/index.ts` — new component CSS
- `scripts/integratedreading/render/svg/` — new yantra-plate SVGs, dasha-waveform SVG, decision-plate components
- `scripts/integratedreading-mode.ts` — `mdToHtmlBlock()` post-processor learns the new wrappers (yantra-hex-trio, sigil-cascade, dasha-waveform from time-period tables, decision-plate from blockquote triggers)

The same `--use-cache` re-render workflow works: pass content is preserved, only the HTML render changes. Validation = re-render the 723/working/ L3 + L5 with the new pipeline, eyeball the result.

**PDF is explicitly out of scope** for v2 per user direction. Print stylesheet may be revisited later but is not a blocker.

---

## 9. Build phasing (proposed)

| Phase | Deliverable | Time est | Validation |
|---|---|---|---|
| **P0** | This design MD, user-approved | done after this PR | "Yes, build it" |
| **P1** | Cover redesign (orbital sigil) + constellation-grid background + La-Arc-fade closer | 1 commit | `--use-cache` re-render, eyeball cover + page atmosphere |
| **P2** | `<verse>` refinement (micro-sigil markers) + typography fluid scale + body layout simplification | 1 commit | Re-render, check reading rhythm |
| **P3** | `<witness-pulse>` + `<yantra-plate>` (per-Pass mandala renderers, 4 designs) | 2-3 commits | Re-render, eyeball Part openers |
| **P4** | `<yantra-hex-trio>` (replaces `.data-cards`) + `<sigil-cascade>` (replaces `.data-cascade`) | 1 commit | Re-render, check Native-comparison data |
| **P5** | `<dasha-waveform>` + `<decision-plate>` (specialized data carriers) | 1-2 commits | Re-render, check time-period rendering |
| **P6** | Motion polish — yantra-plate stroke-dasharray builds, hex-trio pulses, breath-paced animations | 1 commit | Eyeball test in browser |

Total: ~6-8 commits, ~1-2 days work. Each phase independently shippable.

---

## 10. What we are NOT doing

- Not changing the reading content (passes, register system, mode docs all unchanged)
- Not changing the orchestrator (`integratedreading-mode.ts` core logic)
- Not building a new PDF render in v2 (deferred)
- Not introducing a JavaScript framework — vanilla HTML+CSS+inline-SVG continues
- Not adding photography or stock imagery (per `06-visual-identity.md` § Imagery)
- Not changing the brand palette or typography (locked to Goethe spectrum + Panchang/Satoshi/SF Mono)

---

## 11. Locked decisions (user-validated 2026-05-15)

1. **Per-Pass yantra mapping — DATA-DRIVEN.**
   Each mode-doc declares a `yantra_family` in frontmatter. Each pass in the `pass_plan` may declare an optional `yantra: <name>` override. The orchestrator passes the resolved yantra name to the renderer at render time. The yantra SVG is rendered from a family registry (`scripts/integratedreading/render/svg/yantras/*.ts`). Falls back to a sensible default per pass `id` if neither mode nor pass declares.

2. **Decision-plate trigger — `> ⌬ ACT:` MARKER.**
   Blockquotes whose first line starts with `⌬ ACT:` are transformed into `<decision-plate>` components. Convention:
   ```markdown
   > ⌬ ACT: Stabilize family discussions in early evening
   > WINDOW: 17:30–19:00 IST
   > DATE: 2026-09-14
   > QUOTE: Wisdom is the reward for a lifetime of listening.
   ```
   The mdToHtmlBlock post-processor parses these fields. Other blockquotes render as normal `.verse` blockquote with subtle accent.

3. **Cover orbital text — FULL WOW.**
   Title set on SVG `<textPath>` curving along the upper arc of the sigil. Lineage text curves along the lower arc. Subject names appear as constellation-point labels at compass positions around the sigil. Kha Arc atmosphere full-bleed canvas. Bioluminescent core glow centered. Maximum motion impact. Mobile fallback degrades to stacked text — but desktop gets the orbital treatment.

4. **Mode-keyed yantra families — YES, per-mode topology.**
   Each mode owns its own yantra family registry. Initial scope: composite-triad gets the triangle family (this PR's P1-P6 implementation target — we have working fixtures). Other modes get their yantra families filled in incrementally:

   | Mode | Yantra family | Topology hint |
   |---|---|---|
   | composite-dyad | vesica family — interlocking circles | dyad-arc |
   | composite-triad | triangle family — triadic mandala variants | triad-triangle (P1 target) |
   | partner-synastry | bridge family — dyadic arcs with cross-chart links | dyad-arc + bridges |
   | business-partners | axis-mundi family — 7th-house anchored | dyad-arc + 10th-pillar |
   | family-penta | pentagram family — five-pointed star variants | pentagon |
   | team-synergy | web-graph family — variable node graph | web-graph |

   composite-triad's triangle family includes 4 yantra plates:
   - α (Opening / Identity) → `triad-mandala` (the field plate, already exists)
   - β (Resonance / Mutual) → `vesica-trio` (three interlocking circles, intersections illuminated)
   - γ (Phase-lock / Time) → `dasha-spiral` (concentric ring waveform)
   - δ (Anti-dependency / Synthesis) → `compass-trine` (cardinal compass with central seed)

---

## 12. Closing — what success looks like

Open the rendered HTML and the visual rhythm of WitnessOS reads back: bioluminescent geometry as carriers of information, verses illuminating one at a time in their geometric homes, the Part-yantras tracking the reader's progress, the dasha-waveform pulsing where time-data lives, the La Arc closing each section. **The geometry is the structural skeleton, the prose is what flows through it.**

If we open the L3 and L5 W×H×Mohan readings after the build and they feel like the dashboard.png + breathnav.png + hrv.png + decisionscreen.png screens stitched into a long-form scroll — we shipped it correctly.
