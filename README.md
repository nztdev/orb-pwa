# Orb — a screened, disclosed, consent-first self-inquiry PWA

## What this is

A guided self-inquiry session, built as a static PWA (hostable directly on
GitHub Pages, no backend). Its design goal is a genuinely calming, absorptive
experience — the kind that can loosen the ordinary sense of "self as separate
from experience" — built entirely through **disclosed, transparent** means
rather than covert psychological technique.

## Why it's built this way (read before modifying)

Three hard constraints shape this codebase. They aren't arbitrary — each maps
to a specific real-world risk:

1. **No flicker/strobe.** `visualEngine.js` only ever animates on slow,
   smooth, breath-paced cycles (~6 second period). It never oscillates
   brightness at a fixed frequency. Frequencies in roughly the 3–30Hz range
   are associated with seizures in people with photosensitive epilepsy —
   many of whom don't know they have it until triggered. A checkbox can't
   screen for that reliably, so the fix here is architectural: the risk
   frequency band simply isn't reachable by this code. **Do not add strobe,
   flash, or fast-oscillating effects, even for a "deeper" intensity mode.**

2. **No dichotic or hemisphere-overload audio.** `audioEngine.js` plays one
   tone, identical in both ears (mono routed to stereo destination). It
   deliberately does not do binaural beats or different content per ear.
   That mechanism works by overloading conscious processing — which cuts
   against the "always disclosed, always within conscious control"
   principle the rest of the app is built on.

3. **Real screening, not a liability checkbox.** `app.js`'s
   `evaluateScreening()` routes users into `standard`, `gentle`, or
   `not-now` based on actual risk-relevant questions (seizure history,
   psychosis/dissociative history, current derealization, current
   stability) — not a single "I consent to everything" tickbox. `not-now`
   withholds the session entirely rather than gating on intent alone.

If you extend this app, keep new features consistent with these three. If a
feature only works by being fast/flickering, hidden, or bypassing the
screening gate, it doesn't belong here — build it as a clearly-labeled
separate mode with its own disclosure and screening instead.

## Architecture

```
├── index.html          # All screens as sections in one document;
│                        # app.js toggles aria-hidden to move between them
├── manifest.json        # PWA metadata
├── sw.js                 # Offline caching of static assets only
├── css/
│   └── main.css        # Token system: colors, type, layout (see header vars)
└── js/
    ├── app.js          # State machine: screening logic, consent gating,
    │                     session timer/prompts, ground-now handling
    ├── visualEngine.js # Canvas-based breathing orb + particle field
    └── audioEngine.js  # Single ambient tone (mono, no dichotic routing)
```

### State machine (`app.js`)
Screens: `welcome → disclosure → screening → screening-result →
consent → customize → session → grounding`. Each screen is a `<section
data-screen="...">`; `showScreen(name)` toggles `aria-hidden`. The
"Ground me now" button is only visible during `session` and immediately
calls `endSession(true)`, which stops audio/timer and routes to `grounding`
regardless of time remaining.

### Screening → routing
`evaluateScreening()` maps raw answers to one of three routes:
- **standard** — full customization (duration, visual depth, tone).
- **gentle** — visual depth locked to 1 (near-static), plus an inline note
  suggesting a doctor check-in; used for reported epilepsy/seizure history.
- **not-now** — session withheld; supportive message, no guilt-tripping
  copy, option to return home. Used for psychosis/dissociative history,
  current concerning derealization, or current instability.

This routing is intentionally visible in the UI copy (`screening-result`
screen) — the user is told *why* they're getting a particular version, not
just handed a locked door.

### Customization (`customize` screen)
Duration (3–15 min), visual depth (1–3, hidden entirely in `gentle` mode),
and ambient tone (`low` / `mid` / `none`). All three are read by
`startSession()` and passed into the two engines.

## Extending it modularly
- **New visual styles**: add methods to `VisualEngine` and a new option in
  the `customize` screen's markup + `wireCustomize()`. Keep all motion on
  slow, smooth cycles (see constraint #1).
- **New prompts/scripts**: edit the `PROMPTS` array in `app.js` — kept as
  plain, disclosed, non-presuppositional language by design (avoid
  Ericksonian double-binds; say what's happening, don't imply it's already
  happening involuntarily).
- **New screening questions**: add a `fieldset` to `#screening-form` and a
  branch in `evaluateScreening()`. Prefer erring toward `gentle`/`not-now`
  when uncertain.
- **Analytics/backend**: none currently — this is a fully static, one-page
  app so it can run on GitHub Pages with zero server cost. If you add a
  backend, don't log screening answers in a way that could identify
  someone's mental health disclosures.

## Deploying to GitHub Pages
1. Push this folder to a repo.
2. Repo Settings → Pages → deploy from the branch/root.
3. Done — no build step, no server.

## What's intentionally *not* included
No dichotic audio engine, no photic-driving shader, no Ericksonian
suggestion scripting, no "illusion of control then take it away" latency
injection. These were part of the original concept but drop the risk
profile from "a calming, disclosed practice" to "an unsupervised
psychological intervention on strangers" — see the conversation this app
was designed in response to for the fuller reasoning.
