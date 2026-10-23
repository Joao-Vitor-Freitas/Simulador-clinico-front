# Simulador Clínico — Next.js frontend

A responsive clinical simulation interface for the FIAP Hospital Moinhos de Vento challenge. Students register, choose a case, interact with a virtual patient, inspect vital signs and protocols, and review the outcome. The Python API is the authority for time, clinical state, and Gemini evaluation.

Source repository: [Simulador-Clinico-Front-End](https://github.com/DoteMe/Simulador-Clinico-Front-End). Team names and RM numbers are in [INTEGRANTES.TXT](INTEGRANTES.TXT).

## Stack

Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4. The app uses functional components, props, hooks, and the custom `useSimulation` hook. Clinical data comes from the FastAPI backend. The mocked HTML/CSS/JavaScript prototype has been removed. Visual tokens and interaction patterns are documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

`app/` defines the Next.js routes and protected layout, `src/screens/` contains the four screens, `src/components/` shared UI, `src/hooks/` simulation polling, `src/auth.tsx` authentication context, `src/api.ts` the HTTP client, and `src/types.ts` the API contracts. `src/styles.css` combines Tailwind utilities with reusable clinical UI patterns.
The simulation room uses the supplied hospital pixel-art atlas and a transparent three-pose patient derivative in `src/components/PatientScene.tsx`, styled by `src/scene.css`. The backend still supplies every clinical measurement and outcome.

## Setup and run

Requirements: Node.js 20.9+ (Node 22 or 24 recommended), npm, and the Python backend.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Start the backend separately from `../backend` using its [README](../backend/README.md). Open `http://127.0.0.1:3000`. The frontend `.env.local` contains only `NEXT_PUBLIC_API_BASE_URL`; keep the Gemini key and database URL in `backend/.env` or the backend server environment. Never put secrets in a `NEXT_PUBLIC_` variable.

```bash
npm run typecheck
npm run build
npm run start
```

## Routes and flow

At the end of a simulation, the result page opens an optional experience survey. Students can mark whether they liked it, rate clarity and difficulty from 1 to 5, and describe what helped or needs improvement. They can dismiss the prompt, reopen it, or edit a submitted response from the result page. One response is stored per completed attempt in the Python database; reloading does not ask again after submission. The backend README documents the authenticated endpoints and `feedback_summary.py` analysis command. These responses provide real usage feedback for CTWP Sprint 4, alongside the separate observed three-student usability study.

- `/entrar`: login or registration. Registration asks for a display name and a password of at least 8 characters. A fictional email in valid format is accepted; email ownership is not verified and there is no password recovery, so students must keep their chosen credentials. The header and dashboard show the name instead of the email.
- `/`: private dashboard with available cases and the student's attempt history.
- `/simulacoes/:id`: private simulation with visible symptoms, vital signs, live state refresh, Gemini interactions, protocol reveal, time advance, report, and finish.
- `/simulacoes/:id/resultado`: private final clinical evolution, diagnosis, and feedback.

The backend base URL defaults to `http://127.0.0.1:8000/api`. Auth uses a bearer token in `sessionStorage`; the app verifies it with `/auth/me` on reload. The selected case duration and manual time advance interval are remembered in `localStorage`. New attempts offer 1, 3, 5 or 10 minutes, with 5 minutes as the default. The advance menu offers presets from 10 seconds to 10 minutes plus a custom value in seconds, limited by the case duration; defaults are 10 seconds for 1-minute cases, 30 seconds for 3- and 5-minute cases, and 1 minute for 10-minute cases. The app refreshes running simulations every 10 seconds while the tab is visible; the countdown advances locally between refreshes. Clinical values display at most one decimal place. The dashboard has History and Feedback tabs; Feedback shows the student's submitted experience surveys and lets them edit each response directly in the tab. The clock and result are always computed by the backend. The simulation route frames only the room and chat. Navigation, timer, vital signs, symptoms, and recent evolution sit in the surrounding site layout. Protocol selection and reveal are inside the chat drawer; consulted protocols are listed in the final feedback. On phones, the clinical panels follow the room and chat.

The message composer sends with Enter and inserts a line break with Shift+Enter. It consumes an authenticated SSE stream from FastAPI: provisional patient text appears as Gemini produces it, and the final validated response is saved before the UI treats it as complete. If Gemini is unavailable, the message stays in the field and an error appears beside it. Clock-only updates no longer invalidate an AI response while it is being generated; a competing interaction still asks the student to review the latest state. The static monitor waveform animation was removed.

The case cards name the presenting complaint. Introductory cases vary their second symptom per attempt, and some symptoms start hidden: students can ask about other complaints to discover them. A correctly addressed complaint is marked as addressed and cannot receive the same intervention again. The result opens automatically when all selected complaints have been addressed, with a successful educational outcome; the final zeroed symptoms and stabilized vital signs represent completion in the simulator, not instant recovery in a real patient. The evolution panel is near the top of the room and highlights worsening, improvement, and newly discovered complaints after each refresh or conduct.

The protocol drawer labels its three levels as orientation, direction, and expected conduct. It links the clinical reference for the selected complaint to the NHS, the single portal used for built-in cases. The result also links the references for consulted protocols. A partial classification means only part of the expected conduct was covered. Exact full level-3 wording is accepted as correct by the API; paraphrases continue through Gemini evaluation. These short educational summaries are not clinical orders or a substitute for local medical review.

The dashboard presents case cards first, then the source list with seven NHS references. The links cover fever, headache, common cold, sore throat, dizziness, dehydration, and suspected heart attack. The protocol drawer and result retain their source links for consultation during and after the case.

The dashboard, sources, feedback editor, and result view use the same restrained clinical style: white panels, thin dividers, navy actions, and status colour only when it carries meaning. The simulation room remains illustrated, but its surrounding controls and measurements follow the same style. Symptom severity uses restrained green, amber, and red bars. The evolution section sits directly below the patient simulation on desktop and mobile; it can be expanded, and its compact state names only changes visible at the displayed precision.

Questions and reassessment-only messages are shown as **Avaliação do quadro** in the result, rather than an incorrect conduct. They may uncover a hidden symptom but cannot complete a complaint. The student must provide a concrete intervention to finish the case.

## Verification

Run `npm run typecheck` and `npm run build` for TypeScript and production compilation. The local browser-to-API check and screenshots are recorded in [docs/VALIDATION.md](docs/VALIDATION.md). The Sprint 4 implementation sequence is in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), and the team can record its required three-participant study in [docs/USABILITY_STUDY.md](docs/USABILITY_STUDY.md). Backend service unit tests run from `../backend` with `.venv/bin/python -m pytest -q tests`.

## Deployment

Deploy the Next.js frontend on the same VPS as FastAPI or on Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the public HTTPS backend URL ending in `/api`, and set backend `ALLOWED_ORIGINS` to the exact frontend origin. A single VPS can keep the backend database in a persistent local SQLite file; Supabase is optional. See the backend README for its absolute `DATABASE_URL`, backups, migrations, and traffic limits. Verify the published streaming flow before sharing a public link.

The concrete free-tier checklist is in the [backend deployment guide](../backend/DEPLOY_ORACLE_VERCEL.md).

No deployment URL or test account is included because none has been provisioned. Add the actual public frontend and backend URLs after deployment and verify the published browser flow. Students can create their own accounts using the registration screen; if a demonstration account is provisioned, document it for the evaluator without exposing a real password or key.

## AI use

The backend calls Gemini for patient responses and interaction evaluation through `google-genai`. The frontend sends the student's text and the selected visible symptom, then renders the stored response. The backend validates model output before changing clinical state. Development assistance was used to structure the application, API integration, and documentation; clinical outcomes remain governed by the backend rules. This is an educational simulation, not medical advice.
