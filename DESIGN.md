---
name: StraitSignal
description: Maritime and political-risk intelligence for explainable oil-futures forecasting
colors:
  abyss: "#050d18"
  navigation-abyss: "#07111d"
  operations-navy: "#081624"
  working-navy: "#0a1a29"
  raised-navy: "#0d2032"
  selected-navy: "#11283b"
  data-line: "#18364c"
  chart-track: "#153044"
  cloud-white: "#e8f1f7"
  secondary-text: "#9bb0c2"
  faint-text: "#6f879b"
  signal-teal: "#31d3c5"
  signal-teal-hover: "#56e2d6"
  analytical-blue: "#59a8ff"
  warning-amber: "#f6b94a"
  risk-coral: "#ff6d73"
  risk-text: "#ffd9dc"
typography:
  display:
    fontFamily: "Bahnschrift, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(2.7rem, 7vw, 6rem)"
    fontWeight: 650
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bahnschrift, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(1.9rem, 3.6vw, 3.6rem)"
    fontWeight: 620
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bahnschrift, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 620
    lineHeight: 1
  body:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Cascadia Code, Consolas, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
  micro:
    fontFamily: "Cascadia Code, Consolas, monospace"
    fontSize: "0.62rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  micro: "3px"
  control: "4px"
  segment: "5px"
  strip: "6px"
  panel: "8px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal-teal}"
    textColor: "{colors.abyss}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  panel:
    backgroundColor: "{colors.operations-navy}"
    textColor: "{colors.cloud-white}"
    rounded: "{rounded.panel}"
    padding: "20px"
  button-segment:
    backgroundColor: "{colors.selected-navy}"
    textColor: "{colors.cloud-white}"
    typography: "{typography.label}"
    rounded: "{rounded.micro}"
    padding: "8px 10px"
---

## Overview

**Creative North Star: "The Maritime Intelligence Plotting Room."**

StraitSignal should feel like a well-run research desk monitoring a fast-moving physical system: dense where comparison matters, quiet where judgment matters, and exact about the boundary between evidence and inference. The signature is a navigational plot where market time series, chokepoint flow, and uncertainty bands share one coherent notation.

**Key Characteristics:**

- Deep navy operational surfaces with restrained teal, blue, amber, and coral signal roles.
- Asymmetric, information-led composition rather than a grid of interchangeable metric cards.
- Large analytical plots, compact source strips, and provenance embedded near the evidence.
- Workhorse sans typography for reading and real monospace only for measurements, timestamps, and identifiers.
- Purposeful motion limited to data refresh and scenario transitions.

## Colors

The palette is restrained: navy carries the workspace, cloud white carries primary reading, and signal colors retain fixed meanings. Teal means favorable/online, analytical blue means modeled/selected, amber means degraded/uncertain, and coral means downside risk or failure.

**The Signal Semantics Rule.** A signal color never changes meaning between charts, source health, and alerts.

**The Navy Depth Rule.** Depth comes from clearly stepped navy surfaces and structural shadows, not decorative glow or translucent glass.

## Typography

Bahnschrift or a condensed system fallback gives headlines the compressed authority of a briefing cover. Segoe UI or the native sans stack carries narrative and controls. Cascadia Code or Consolas is reserved for values, source IDs, timestamps, and model notation.

**The Measurement Rule.** Monospace is earned by data or machine-readable content; explanatory prose never uses it as an OSINT costume.

## Layout

Desktop uses a slim fixed command rail and a broad analysis canvas. The first viewport is dominated by one forecast plot and an adjacent decision brief, followed by a wide chokepoint map and linked evidence modules. Major regions align to an 8-column plot grid but may span asymmetrically.

On tablets, the rail becomes a compact top command bar and plots stack in reading order. On phones, source health and scenario controls become horizontally scrollable; charts keep a minimum legible width inside controlled overflow rather than compressing labels into noise.

**The Evidence-First Rule.** The largest area always belongs to the evidence currently driving the decision, not to navigation or decorative branding.

## Elevation & Depth

The system is predominantly flat and layered. A raised panel uses either a fine structural border or a directional soft shadow, never both by habit. Sticky command surfaces receive a subtle downward shadow to clarify overlap during scroll.

## Shapes

Panels use compact 8px corners; controls use 4px corners. Pills are reserved for small statuses, timeframe selectors, and source states. Forecast ribbons, geographic arcs, and directional wedges provide the recurring curved geometry.

## Components

Primary actions are teal fields with dark text. Segmented controls use tonal navy selection plus a blue keyline. Panels include a clear title, a local timestamp/provenance line when relevant, and a defined empty/degraded state. Charts always include units, observed-versus-modeled encoding, and an accessible text summary.

## Do's and Don'ts

- Do label demo, stale, inferred, and live values explicitly.
- Do show forecast intervals and model spread beside point estimates.
- Do use source-specific failure copy with a recovery path.
- Do let one large analytical object organize each section.
- Don't present the forecast as financial advice or guaranteed truth.
- Don't decorate every number with a rounded container.
- Don't use neon glow, gradient text, or glass panels.
- Don't imply that polling causes oil prices; show it as a scenario or market-prior input.
