# Integration validation

The React app was checked against a local FastAPI server with a temporary SQLite database and a fake evaluator. The fake evaluator returns a deterministic patient response, so this check verifies the browser-to-API-to-database flow without consuming the configured Gemini key or relying on model availability.

On 21 October 2026, a headless Chromium run completed these tasks:

1. Register and authenticate a new student.
2. Load the available case and start a timed simulation.
3. Submit an interaction and display the persisted patient response.
4. Reveal a protocol level and display its stored content.
5. Report an interaction and receive confirmation.
6. Confirm completion, view the result, and reload the result route.
7. Simulate a failed interaction request, verify an actionable error, then retry successfully.

The browser reported zero page errors. Screenshots: [desktop dashboard](evidence/dashboard-desktop.png) and [mobile simulation](evidence/simulation-mobile.png). These screenshots use fictional test account details and the fake evaluator. The backend service suite now contains 43 focused unit tests covering auth, cases, simulations, reports, and the student-facing state projection. The frontend production build and TypeScript check passed.

A live Gemini request, public deployment, and the challenge's three-participant usability study have not been performed. The team must conduct the participant study, record findings, and supply the Vercel URL before submission. Team names/RM numbers and the repository remote are now documented in the frontend.

## Frontend integration pass — 21 October 2026

An isolated FastAPI server on port 8011 used a temporary SQLite database and `FakeEvaluator`; Vite on port 5175 pointed to its `/api`. In a browser, a new student registered, started a case, submitted an interaction, saw the persisted patient response and changed vital sign, revealed a protocol, reported the response, advanced one minute, confirmed finish, and reloaded the final result. Reopening the finished simulation still displayed its interaction and revealed protocol. At 375px, the result and finished simulation had no horizontal page overflow. A revoked token redirected to `/entrar` and displayed the session-expiry message. The [mobile result screenshot](evidence/result-mobile-2026-10-21.png) comes from that run.

The browser initially logged two missing `favicon.ico` requests. A local SVG favicon was then added. The new CSS observation room was also added after this browser run; its TypeScript and Vite production build passed, but its appearance has not yet been checked in a browser. The subsequent browser interaction was rejected by automatic approval review because its usage limit had been reached, so the remaining browser checks could not be completed in this session. This was a review limit, not a finding that the action was unsafe.

The frontend `npm run build` passed after the scene change. The backend service suite passed with **43 tests**. Browser checks still needed for the final scene, timeout and critical endings, network failure, and `409`/`503` action errors. Public deployment, live Gemini, and the three-participant study also remain unverified. The study record is prepared in [USABILITY_STUDY.md](USABILITY_STUDY.md).

## Pressure-loop integration pass — 22 October 2026

The backend returned server-derived `remaining_seconds` and a one-minute browser attempt counted down in seconds. With a temporary SQLite database and `FakeEvaluator`, a new account started a case, sent a text question, and saw the symptom intensity change from 8/10 to 3/10 with an evolution notice. The compact timer appeared when the main timer left the viewport. Advancing one minute changed heart rate, oxygen saturation, and both symptom intensities; the backend ended the attempt as **Tempo esgotado**. The UI disabled further interaction and displayed the result link. The result displayed the actual interaction, time used, classification count, final signs, and symptoms. This verifies a simulated time advance, not a full naturally elapsed one-minute timeout.

Checks: `PYTHONPATH=.:tests .venv/bin/pytest -q` passed **44 tests**; `npm run typecheck` and `npm run build` passed after the final copy and formatting changes. The browser session was run against FastAPI and Vite on local loopback ports. At 375px, the result page had no horizontal overflow; see [mobile result](evidence/pressure-result-mobile-2026-10-22.png). The browser logged one console error from the first registration attempt using a `.test` email; retry with an `example.com` address succeeded.

Still to verify: natural wall-clock timeout, critical deterioration, mobile review of the full active simulation, offline/`409`/`503` recovery, a live Gemini request, public Vercel deployment, and three representative students. The backend result currently summarizes active symptoms rather than a persisted clinical timeline; hidden or complex findings still have no exam workflow.

## Encounter layout correction — 22 October 2026

The simulation screen now shows visual bars for vital signs and symptom intensity. A local browser run at 375×812 confirmed that the patient and dialogue views fit within the viewport with no horizontal overflow; the three mobile views switch between patient, dialogue, and decisions while the timer remains visible. The decisions view is slightly taller than one viewport because it also contains protocols and finishing controls. At 1365×768, the patient, dialogue, and decision columns were visible together; the optional resource panels continue below the main workspace. This layout run used a temporary SQLite database and `FakeEvaluator`.

## Original scene replacement — 22 October 2026

The old patient sprite was a 504×378 sheet of six columns; CSS treated frames as 144px wide, causing incorrect crops. The React scene now uses an original vector room and patient with four appearance palettes and stable/intense/critical expressions. The patient, dialogue, and decision layout and existing API flow remain intact. A new local FastAPI/Vite browser run displayed the scene at desktop and 375px mobile widths without horizontal clipping; screenshots: [desktop](evidence/new-scene-desktop-2026-10-22.png) and [mobile](evidence/new-scene-mobile-2026-10-22.png). Frontend typecheck and production build passed. The illustration conveys status; vital numbers and severity labels remain the clinical source of truth.

## Supplied pixel-art atlas — 22 October 2026

The project owner supplied `assets/Hospital Pixel Art Asset Sheet.png`. The current scene uses its hospital-room region directly through an SVG viewport, and an AI-assisted transparent three-pose patient derivative based on the same sheet. This supersedes the earlier vector scene while keeping the simulation API and interaction flow unchanged. At 1365×768 and 375×812, the room and patient rendered without opaque crop rectangles or horizontal overflow; see [desktop](evidence/new-atlas-desktop-2026-10-22.png) and [mobile](evidence/new-atlas-mobile-2026-10-22.png). Typecheck and production build passed. The supplied atlas had no accompanying license file, so reuse terms should be confirmed before public release.

## Immersive simulation layout — 22 October 2026

The simulation route now uses the pixel-art room as a full-screen scene with translucent clinical readings and chat over it. The timer and finish control remain together at the top; on mobile the toolbar stays visible while the student scrolls to the full clinical details below the scene. The global navigation is hidden on the active simulation route. Browser screenshots at 1365×768 and 375×812: [desktop](evidence/immersive-desktop-2026-10-22.png) and [mobile](evidence/immersive-mobile-2026-10-22.png).

Against local FastAPI with a temporary database and FakeEvaluator, the mobile browser opened and revealed a protocol inside the chat, submitted a question and displayed the persisted reply and updated symptom intensity, reported that reply from its flag icon and received confirmation, then confirmed finish beside the timer and reached the result route. This run did not use Gemini or a public deployment.

## Framed room and animated assets — 22 October 2026

Following review of the immersive layout, the room now preserves the atlas room's full aspect ratio and clips all other atlas regions. The clinical review, full vital measurements, symptom state and severity, evolution, and consulted protocols are inside the simulation frame. The translucent chat is centered. The supplied patient sprite cycles through front-facing frames in stable state; intense and critical poses breathe subtly, and a decorative monitor line moves. Reduced-motion settings stop those animations.

A local FastAPI/Vite browser run with a temporary SQLite database and FakeEvaluator showed the revised desktop and 375px mobile layouts: [desktop screenshot](evidence/framed-desktop-2026-10-22.png) and [full mobile screenshot](evidence/framed-mobile-2026-10-22.png). The mobile page had no horizontal overflow, and the rendered patient's animation name was `patient-breathing`. Both screenshots contain fictional test data. The run did not validate a live Gemini response.

## Site-framed clinical rails — 22 October 2026

The scene layout was revised again following product feedback: the site's white navigation and pale background now surround the central room; vital signs and symptoms use numeric labels plus bars in toggleable outside panels; the scene itself has no gradient. The patient is larger and positioned at the room floor, while the animated ECG is drawn inside the monitor screen in the room atlas. The central chat retains protocol, report, and time controls. The supplied asset sheet is used for the room and chat icons; the separate patient sprite sheet supplies stable-state animation.

`npm run typecheck` and `npm run build` passed. A new live browser screenshot for this exact revision could not be captured: automatic approval review rejected the local server bind on ports 5175 and 8011 because the review usage limit was reached. The action was not executed; the rejection did not characterize the action as unsafe. The earlier framed desktop/mobile screenshots above show the preceding revision and should not be treated as evidence for this final layout.

## Simulation page layout revision — 22 October 2026

The only frame now encloses the room and chat. Site navigation, server-derived timer, finish/result control, all returned vital signs, visible symptoms, recent evolution, and revealed protocols are outside it. The clinical-data hide toggle and the hard-coded vital-sign bar scale were removed. The patient uses three poses from one asset and is horizontally centered independently of its breathing animation. Symptom segments represent the backend's 0–10 intensity; critical vital labels follow its `is_critical` flag rather than assumed medical thresholds.

`npm run typecheck` and `npm run build` passed. A local server was not available for a new browser screenshot in this environment, so desktop/mobile appearance and interaction for this exact revision remain to be checked in a browser. Earlier screenshots in this document show earlier layouts.

## Clinical indicators and timer refinement — 22 October 2026

A later browser connection to the already running local Vite and FastAPI servers allowed visual validation. At 1365×768 and 375×812, the timer and patient centers matched the viewport/room center within 1 CSS pixel. Both widths had no horizontal overflow. The patient's feet now stand on the room floor instead of the foreground desk. The vital status rail shows the backend's monitored/critical classification without pretending to be a numeric measurement scale. Protocol level 1 was revealed through the chat and appeared both in the chat drawer and the outside protocol panel. The browser reported zero console errors. Evidence: [desktop](evidence/ui-review-wide-adjusted-2026-10-22.png), [mobile](evidence/ui-review-mobile-2026-10-22.png). This run used a local test account and the configured local backend; it did not verify live Gemini or public deployment.

The test attempt was then ended through the confirmation flow. Reopening its simulation route showed the compact `Resultado ↗` link outside the room and the elapsed time in the centered timer. The empty conversation copy was corrected for this finished state, and the duplicate result link inside the room was removed.

## Thermometer and protocol drawer — 22 October 2026

The old prototype's narrow vertical thermometer shape was restored beside each vital value, driven by the backend's critical flag rather than fabricated numeric ranges. The consultation selector and reveal action now live inside the protocol drawer. The chat header and the outside consulted-protocol panel were removed; protocol and one-minute controls sit at the left of the chat. On a 375px viewport, opening the drawer initially exposed a height issue; the message composer now hides while a drawer is open, preserving its typed content, so the reveal button remains visible. The browser selected *Falta de ar*, revealed level 1, and displayed that content in the final feedback after finishing. The result had no horizontal overflow at 375px. Evidence: [desktop](evidence/thermometer-desktop-2026-10-22.png), [mobile simulation](evidence/thermometer-mobile-final-2026-10-22.png), [mobile protocol drawer](evidence/protocol-mobile-final-2026-10-22.png).

## Sprint 4 mathematical decision support — 24 October 2026

`npm run typecheck`, `npm run build` and `npm run test:matematica` (16 scenarios) pass. In a browser, the app ran against a throwaway Node server that replays the SpO₂ sequence 92 → 90 → 87 → 82 → 95 → 97 → 98 % (with heart and respiratory rates) one minute at a time, not against FastAPI or Gemini. The panel went Estável → Em Atenção → Piora Crítica (S′ = −5 %/min, deficit 7 %·min at 3 min) → Em Recuperação at 4 min, ended with a deficit of 11 %·min, saved 7 readings, and the result page showed the same final classification. At 375 px the page had no horizontal overflow. Not verified: real backend vital sign names, a naturally elapsed run, and a case without SpO₂ in the browser (covered only by a unit test).
