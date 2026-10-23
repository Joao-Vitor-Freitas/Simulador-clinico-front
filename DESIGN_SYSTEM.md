# Clinical simulator visual system

The React interface uses the dashboard overview as its visual reference: navy headings, white surfaces, thin dividers, compact controls, and colour reserved for clinical status. The pixel patient remains in the simulation view, while the surrounding interface reads like a clinical observation panel. The diagnosis stays hidden until completion.

| Token | Value | Use |
| --- | --- | --- |
| Navy | `#193655` | Headings, time panel, completion action |
| Blue | `#005bbf` | Navigation, focus, informational labels |
| Magenta | `#ed145b` | Critical status only |
| Pale blue | `#e9f3fc` | Subtle informational surfaces |
| Green | `#527669` | Improvement and stable clinical status |
| Paper | `#f5f7fa` | Page background |

The interface uses the system sans stack to preserve clear rendering on lab and mobile devices. Case cards precede the source list on the dashboard, and source links form a reference list instead of coloured chips. Result, feedback, and case panels use flat white surfaces, narrow borders and square corners. The simulation keeps the site's white canvas around a central pixel-art room. Clinical panels flank the room and show numerical values with continuous severity-coloured bars. The evolution section sits below the patient simulation and can be collapsed to a brief relevant summary. Protocol and report controls live with the conversation, and ending the case is next to the clock. On phones, the room, chat, evolution, and clinical panels stack in that order. Buttons and links retain focus cues; form fields keep their normal border when focused. Motion respects reduced-motion preferences.

The simulation's 2D observation room uses the supplied hospital pixel-art atlas at its full aspect ratio and a transparent three-pose patient derivative. Poses respond to backend-derived severity. The room illustration is muted to keep the surrounding clinical values and controls prominent. No 3D dependency or client-side clinical model is needed.

Reusable patterns include `button`, `panel`, `eyebrow`, `feedback-panel`, cards, status pills, and form controls. Tailwind defines the palette tokens and utility layer; component CSS holds repeated visual patterns. The browser flow includes loading, empty, error, success, and finish confirmation states.

For a formal usability study, ask at least three representative students to register, start a case, interpret signs, ask a question, reveal a protocol, and finish. Record observed issues and changes in the project submission; no participant study has been performed in this repository yet.
