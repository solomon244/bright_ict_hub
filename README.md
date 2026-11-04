# Ethio Tech Hub

An Ethiopian EdTech platform for programming, AI and digital-skills learning, with an AI tutor (ሰለሞን / Solomon).

- **Backend:** Node.js, Express 4, MongoDB (Mongoose), JWT auth with rotating refresh tokens, Google Gemini for the tutor
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS

## Quick start

```bash
# Backend
cd backend
cp .env.example .env      # fill in MONGO_URI, JWT secrets, GEMINI_API_KEY, SMTP settings
npm install
npm run dev               # http://localhost:5000  (API docs: /api-docs in development)

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Generate strong secrets (needed in production, min. 32 characters):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

If `JWT_SECRET` / `JWT_REFRESH_SECRET` are missing in development, random temporary secrets are used
(everyone is signed out on each restart). In production the server refuses to start without them.

## Tests

```bash
cd backend
npm test            # unit + integration (models are mocked, no database needed)
```

## Security model (Phase 2)

| Area | Behaviour |
| --- | --- |
| Sign-up roles | Public registration allows only `student` or `instructor`. Admins are created directly in the database. Only an allow-list of fields reaches the user model. |
| Quizzes | Students receive questions **without** answer keys or explanations; only enrolled students can read or submit; only the course's instructor (or an admin) can create, edit, delete or view attempts. |
| Uploads | Course media (thumbnail, video, resources) is instructor/admin only. Every file is verified by its real content (magic bytes), stored under a random name and served with `nosniff`. SVG/HTML are not accepted. |
| Rate limits | Global API limit, failed-login limit, sign-up limit, email-action limit (reset / verify), per-user upload limit, per-user AI limit. |
| Hardening | `helmet` headers, NoSQL operator stripping, 1 MB JSON body limit, no leaking of internal error messages in production, JWT errors return 401. |

Known follow-ups are tracked in the roadmap: instructor approval is recorded (`instructorProfile.status`) but not yet enforced
when creating courses, uploaded media still lives on local disk (move to Cloudinary/S3 before serverless hosting),
and tokens are still kept in `localStorage` (httpOnly cookies are planned).

## AI features (Phase 3 — launch scope)

| Feature | Endpoint | Notes |
| --- | --- | --- |
| Provider-independent AI layer | `backend/src/services/ai` | `AI_PROVIDER=gemini` (default) or `openai` (any OpenAI-compatible API via `OPENAI_BASE_URL`). Every call is logged (tokens, latency, errors, optional cost estimate) and capped per student per day (`AI_DAILY_LIMIT_PER_USER`). No prompt text is stored in usage logs; logs expire after 180 days. |
| Saved tutor chats | `POST /api/tutor/chat`, `GET/DELETE /api/tutor/conversations…` | History is stored server-side and read from the database, so clients cannot rewrite the tutor's context. Students can delete any chat. |
| Tutor modes | `mode` on chat | beginner, intermediate, advanced, exam_prep, practice, programming_mentor. |
| Report / rate answers | `POST /api/tutor/messages/:id/feedback` | Thumbs up/down with a reason such as `inaccurate`; AI replies are labelled as AI-generated. |
| Recommendations | `GET /api/recommendations` | **Rule-based** (not an LLM): next lesson, quiz revision for scores under 60%, next-level courses, at-risk (7+ idle days) and goals from the learner's own pace. |
| Instructor quiz drafts | `POST /api/ai/quiz-draft` | Returns a **draft** that must be reviewed and then published through `POST /api/quizzes`; nothing is saved automatically. Retries once on unusable model output and drops duplicate questions or questions with repeated options. In the app: **Manage Course → Quiz** on any lesson opens a quiz builder (AI draft, manual editing, publish/update/delete). One quiz per lesson (`409` on a second). |
| Dashboard coach | `GET /api/dashboard/ai-insights` | Short Amharic coaching card. The generated card is cached per student for 6 hours (`COACH_CACHE_TTL_MS`, in memory per server process) so dashboard visits do not use up the student's daily AI requests, which the tutor shares. Falls back to a rule-based card if the AI is off or fails; fallbacks are never cached. |
| Admin AI usage | `GET /api/admin/ai/usage?days=30` | Requests, errors, tokens, estimated cost, per-feature and per-day volume, answer feedback counts. |

**Tutor retrieval (RAG).** `backend/src/services/ragService.js` ranks passages with BM25 (title and tag matches weigh more), light English/Amharic stemming and an English↔Amharic synonym list. It searches the bundled curriculum plus the text of published platform lessons (cached for 5 minutes; `invalidateLessonIndex()` clears it). A student only gets lesson text from courses they are enrolled in, free courses or preview lessons. The confidence score is the IDF-weighted share of the question's terms found in the best passage, so unknown words lower it; below `RAG_CONFIDENCE_THRESHOLD` (default 0.65) Solomon answers in the cautious "partial context" mode. If the database is unavailable it falls back to the bundled curriculum.

Not built yet: RAG over *uploaded files* (PDF/slides; only lesson text is searched, with keyword ranking rather than embeddings), AI course/lesson generation beyond quiz drafts, AI-graded assessments, career advisor.

## Learning experience (Phase 4 — launch scope)

| Feature | Endpoint / page | Notes |
| --- | --- | --- |
| Verified progress | `POST /api/progress` | The course is derived from the lesson, the student must be enrolled, and the enrolment's `progressPercentage` / `completed` status are now updated (they never were before). |
| XP, levels, streaks, badges | `GET /api/gamification/me` | XP is granted **only by server-verified events** (lesson completed, quiz passed ≥60%, perfect quiz, course completed), once each, through a unique-index ledger. Streaks follow Ethiopian local days (UTC+3). |
| Leaderboard | `GET /api/gamification/leaderboard`, `PUT …/leaderboard-opt-in` | **Opt-in, hidden by default**; shows "First L." only. |
| Learning paths | `/student/paths`, `GET /api/learning-paths[/:id]` | Ordered courses with the learner's progress and "up next". Admins create/edit via API; `npm run seed:paths` builds a Web Development path from matching courses you already have. |
| Code challenges | `/student/practice`, `GET/POST /api/coding/challenges` | JavaScript function exercises with JSON test data. `npm run seed:challenges` adds 6 starters. |
| Playground | `/student/practice` | HTML/CSS/JS in a sandboxed iframe, with console capture; code is saved on the device only. |

**Code execution safety.** The server never runs student code. Challenge tests run in the student's browser in an iframe with `sandbox="allow-scripts"` (no same-origin access to the app, its storage or its API), inside a Web Worker that is killed after 3 s. Because results are computed client-side they are saved as *self-reported practice history* and **do not earn XP**. Server-graded challenges and Python need a separate sandbox service (e.g. Judge0) — planned.

Not built yet: assignments with instructor grading, admin screens for creating paths/challenges (API and seed scripts only), syntax-highlighting editor, Python/React in the playground.

## Community and administration (Phase 5 — launch scope)

| Feature | Endpoint / page | Notes |
| --- | --- | --- |
| Discussions | `/community`, `/api/community/*` | A general board plus one board per course. Students need an enrolment, instructors only see courses they teach, admins see all. Plain text only; authors appear as "First L.". |
| Reporting and moderation | thread/reply **Report**, `POST …/moderate` | Reports are one per user; **3 distinct reports auto-hide** a post until a moderator reviews it. The course's instructor and admins can hide/restore/delete; authors can delete their own. `/admin/moderation` is the review queue. |
| Notifications | 🔔 in the header, `/api/notifications` | Replies, accepted answers and moderation notices. Polled every 60 s (paused when the tab is hidden); expire after 90 days. |
| Instructor insights | `/instructor` (overview), `GET /api/analytics/instructor` | Real numbers for the instructor's own courses: learners, active this week, completion, at-risk (14 days idle), hardest quizzes (≥3 attempts), unanswered questions. Replaces hard-coded placeholder figures. |
| Admin analytics | `/admin/analytics`, `GET /api/analytics/admin` | Users, enrolments, completion, 14-day retention, daily trends, top courses, AI usage. |
| CSV exports | `GET /api/analytics/admin/export?report=daily\|courses` | Aggregated only (no personal data); spreadsheet-formula safe; UTF-8 BOM for Amharic in Excel. |
| Audit log | `/admin/moderation` → Audit log, `GET /api/admin/audit-logs` | Role changes, email changes, instructor approvals, user deletions, moderation actions. |
| Safer user admin | `PUT/DELETE /api/admin/users/:id` | Validated fields only; cannot change your own role or remove the last admin; email changes require re-verification; deletion now erases XP, badges, AI chats, coding attempts, notifications, tokens, tutor records and community posts. |

Not collected / not built: gender and location (no such fields exist, so reports say so), certificates, course approval workflow, study groups, mentorship, announcements, PDF reports. The admin Settings page is now a read-only status page — the earlier form saved nothing and showed made-up values.
