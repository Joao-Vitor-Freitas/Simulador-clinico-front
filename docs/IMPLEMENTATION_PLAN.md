# Frontend implementation plan — pressured clinical simulation

## Product purpose

`UseCase.md` (CSU01) defines a timed clinical encounter. A student questions and treats a virtual patient **while the patient's condition changes**. Waiting, choosing an inadequate conduct, and missing critical findings have consequences. The screen must make this pressure visible. FastAPI owns elapsed time, symptom and vital sign evolution, LLM context, and all endings.

The encounter loop is: start with a patient and clock → observe and ask or act in text → receive the patient's answer → see time and clinical state change → decide again under the remaining time → reach a deliberate, timeout, or critical ending → review decisions, evolution, and time. Protocol consultation and reporting an AI response are available during the loop.

## Implemented through 22 October 2026

- Authentication, case selection, start/resume, text interactions, protocol reveal, AI response report, manual finish, result route, and persisted reload use FastAPI `/api`.
- The server returns `remaining_seconds` from its clock and simulation checkpoint. React counts down between server reads and reconciles every five seconds and when the tab regains focus. A large sticky timer remains visible at the top of the simulation. The server decides expiry.
- The screen compares successive server states and shows changes in symptoms and vital signs after time passes or a conduct is recorded. The 2D scene follows server severity and critical flags. It uses the new supplied hospital atlas and a transparent three-pose patient derivative rather than the old broken sprite-sheet crop.
- The site's pale background surrounds the **only framed area**: the pixel-art room with a translucent chat. The timer, navigation, finish/result, vital signs, symptoms, and recent evolution are page elements outside that frame. Protocol consultation stays in a chat drawer; the list of consulted protocols appears only in the final feedback. The clinical-data toggle was removed. On phones, the room and chat appear first; the clinical panels follow without horizontal scrolling.
- All vital signs returned by FastAPI are rendered and counted. A slim vertical thermometer, based on the original prototype, identifies monitored or critical status using only the backend flag; a recent before/after value comes from state comparison. The old arbitrary percentage scale was removed. Symptom intensity uses ten discrete segments tied to its documented 0–10 value, with explicit state and severity text. The timer sits at the horizontal center of the page above the framed scene.
- The patient uses three poses from the supplied art derivative, centered with an animation-independent horizontal anchor. The ECG line is animated directly over the monitor screen in the supplied room image. Reduced-motion settings disable these effects; backend state still determines all clinical values and patient severity.
- Timeout, critical deterioration, and student completion have distinct messages. The result shows elapsed time, final patient state, interaction classifications, and a decision timeline.
- Backend clock behavior has a regression test. Earlier browser-to-API evidence in [VALIDATION.md](VALIDATION.md) predates this pressure-loop update.

## Use-case traceability and gaps

| Requirement | Current implementation | Remaining acceptance work |
| --- | --- | --- |
| CSU01 steps 1–4, RN01: case, patient, signs, symptoms, limit | Case selection, initial state, immediate timer | Replace generic patient identity with authored case presentation; hide diagnosis until ending |
| Steps 5–8, RN04–05: text exchange using current state/history | Text goes to FastAPI evaluator with state/history | Verify live Gemini with server key and recoverable `503` without losing input |
| Steps 9–12, RN02–03: continual time and clinical change | Server seconds, frequent reconciliation, visible differences, changing 2D scene | Browser verify natural waiting, tab return, manual advance, conduct effects, and delayed polls |
| Exceptions 9–10, RN06: timeout and critical ending | Backend determines ending; UI locks actions and links to result | Browser verify both paths, including an in-flight action at deadline |
| Steps 13–14, RN07: conduct, evolution, time in result | Outcome, time, final state, classifications, interaction history | Add persisted chronological clinical evolution and case-specific learning feedback |
| Protocol alternative, RN11 | Protocol reveal and progress | Ensure every authored symptom has an appropriate protocol |
| AI report alternative, RN08 | Reports store simulation context | Verify report survives reload and is reviewable |
| RN09–10, RN12–13: symptom types, severity, vital signs | Visible symptoms, severity, and signs rendered | **Major gap:** hidden and complex findings lack an exam or machine discovery workflow; add case-defined exams, reveal rules, API, and UI |

The authored case and exam gaps are separate product behavior. This UI pass preserves the existing encounter and replaces unreliable sprite cropping with the supplied pixel-art set; it does not add new stations, scoring stages, or clinical rules.

## Next implementation sequence

1. **Verify the pressure loop.** Run backend tests, frontend typecheck/build, and a browser session against FastAPI with temporary SQLite and deterministic evaluator. Observe countdown, changing state from waiting and conduct, compact timer, reload, timeout, and critical ending. Check phone, desktop, keyboard, and reduced motion. Record evidence in `VALIDATION.md`.
2. **Improve the current encounter presentation.** Keep the existing patient interaction and API flow. Make the room and patient illustration dependable, group clinical readings and actions by urgency, and keep the conversation usable on narrow screens. Any future case-authored findings or exams remain separate product work.
3. **Make consequences legible.** Show what changed and when without falsely attributing time-only deterioration to a conduct. Persist snapshots/events for a full clinical evolution timeline; keep the immediate before/after notice.
4. **Strengthen the learning result.** Include outcome, time, classified actions, evolution, missed/discovered findings, and case-specific feedback. Verify a reloaded result matches persistence and reveals diagnosis only after ending. Do not change the encounter sequence as part of this UI pass.
5. **Complete challenge evidence.** Follow `challenge-docs.md` frontend design and web-development requirements: responsive accessible Portuguese screens, clear hierarchy, working browser-to-Python-to-database flow, real repository/deployment links, and a usability study with at least three representative students. Public hosting and live Gemini require actual infrastructure and credentials; local fake-evaluator tests do not establish them.

## Integration contract and gates

| Action | `/api` endpoint | Frontend owner |
| --- | --- | --- |
| Authenticate | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout` | `auth.tsx`, `AuthPage.tsx` |
| Choose, start, resume | `/cases`, `/cases/{id}`, `/simulations`, `/simulations/{id}` | `DashboardPage.tsx`, `useSimulation.ts` |
| Ask, treat, wait | `/simulations/{id}/interactions`, `/simulations/{id}/time/advance` | `SimulationPage.tsx` |
| Consult, report | `/simulations/{id}/protocols/{symptom}/reveal`, `/simulations/{id}/reports` | `SimulationPage.tsx` |
| End, review | `/simulations/{id}/finish`, `/simulations/{id}/result` | `SimulationPage.tsx`, `ResultPage.tsx` |

Acceptance requires server-derived time pressure and clinical change, disabled input at automatic endings, and the same outcome/history after reload. Test `401`, `409`, and `503` recovery without losing typed text. The Gemini key stays in the backend environment. Record actual checks and unmet requirements in `VALIDATION.md`.
