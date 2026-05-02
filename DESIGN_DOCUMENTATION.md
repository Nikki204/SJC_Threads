# SJC Threads — Design Documentation

## Requirements checklist

| Requirement | How it is met |
|-------------|----------------|
| Create a thread (title + message) | **New Thread** screen (`create-thread-page`) collects title, message, and category; `createThread()` in `app/utils/data.js` persists to local JSON. |
| Comment on threads | Thread detail (`thread-detail-page`) supports comments and nested **Reply** via `parent_comment_id`; `createComment()` saves locally. |
| Like / react on posts & comments | Thread and comment rows expose reactions (`like`, `love`, `idea`, `clap`) with emoji buttons; `toggleReaction()` stores reactions locally and toggles per user. |
| List threads by latest activity | `fetchThreads()` sorts by `updated_at` (fallback `created_at`) descending. Comments and reactions bump the parent thread’s `updated_at` so ordering reflects activity. |
| Edit user profile | **Profile** updates display name, username, and bio through `authService.updateProfile()` (local DB). |
| ≥ 2 plugins | **`@nativescript/theme`** — forced light appearance for consistent navy/white UI. **`@nativescript/webpack`** — official NativeScript bundler integration (`webpack.config.js`, preview/build pipeline). |
| Local-only posts & comments | All entities live in `sjc_threads_db_v1.json` via `LocalDb` (`app/utils/local-db.js`) under the app documents folder (see sample file for submission). |

---

## a. App description, purpose, and target users

**SJC Threads** is a NativeScript (JavaScript) mobile forum-style app branded for **St. John’s College, Belize**. Students and staff can start discussion threads, reply, and react—similar to a lightweight campus Threads feed—without relying on an external server.

**Purpose:** Provide a focused space for academic and campus conversations (questions, ideas, announcements, general topics) while keeping data **private to the device** for coursework and demos.

**Target users:** Secondary/university students and faculty who already know each other offline but want a simple structured discussion UI on mobile.

---

## b. Features implemented

- **Authentication (local):** Register and sign-in backed by hashed credentials in JSON (`auth.js` / `local-db.js`). Demo seed user **admin@local** / **admin123** when the DB file is first created.
- **Home feed:** Lists threads with category chips, preview text, author, relative time, and combined reply/reaction counts; filters by category.
- **Thread detail:** Full post, reactions on the thread, chronological comments with threading/replies, reactions per comment, and a reply bar.
- **Compose:** Create threads with category selection.
- **Profile:** View email/join date context and edit profile fields stored locally.
- **Welcome tour thread:** Seeded announcement explaining app functionality (updated via migration when older seeds exist).

---

## c. Plugins used and why

1. **`@nativescript/theme`**  
   Pins **`Theme.Light`** at startup (`app/app.js`) so the root view stays in **`ns-light`** mode and Android night forcing stays predictable. Without this, system dark mode often overrides custom CSS (black backgrounds), which broke the intended white/navy design during testing.

2. **`@nativescript/webpack`** (with **`tailwindcss`** / **`@nativescript/tailwind`** available for tooling)  
   NativeScript 8 expects webpack bundling for previews and production builds. The project uses the standard **`webpack.config.js`** initialization so XML/JS/CSS assets resolve consistently (including global `app.css`).

*(Additional dev tooling such as **`@nativescript/stackblitz`** supports StackBlitz-style previews when used in that environment.)*

---

## d. How the app is organized

| Area | Role |
|------|------|
| `app/app.js` | Application entry: theme mode + global stylesheet import + `Application.run`. |
| `app/app-root.xml` | Root `Frame`; default page `login-page`. |
| `app/app.css` | Global styling (navy/white theme, cards, buttons, auth layout). |
| `app/views/*.xml` + `*.js` | Screens (login, register, home, thread detail, compose, profile) — XML UI + JS handlers / small view-models. |
| `app/utils/local-db.js` | Loads/saves **`sjc_threads_db_v1.json`**; seeds demo data; migrates welcome thread text when needed. |
| `app/utils/data.js` | Thread/comment/reaction CRUD and sorting logic on top of `LocalDb`. |
| `app/utils/auth.js` | Session + sign-up/sign-in/update profile against local users/profiles. |
| `app/assets/` | Static assets such as the school logo image on auth screens. |

Data flows **UI → utils (`auth` / `data`) → `LocalDb` transaction → JSON file**, keeping persistence explicit and easy to inspect for grading.

---

## e. Reflection — challenges and solutions

The hardest problems were **cross-platform styling** and **truthful “latest activity” sorting**. On both Android and iOS, system dark mode applied **`ns-dark`** and native defaults fought our CSS; variables on `:root` also behaved inconsistently. We solved this by forcing **`Theme.Light`**, moving CSS custom properties onto **`Frame`/`Page`**, and adding solid hex fallbacks where needed. Separately, the feed initially sorted threads only by creation/update timestamps on the thread itself, so busy discussions didn’t rise to the top; we fixed that by **updating each thread’s `updated_at` whenever a comment is added or a reaction changes**, including reactions on comments so discussion stays coupled to thread ordering.

Packaging everything into **one JSON document** meant designing simple relational arrays (`threads`, `comments`, `reactions`, `profiles`, `users`) and wrapping mutations in **`transaction()`** to avoid corrupt writes during rapid taps.

---

## Submission notes

- **Source code:** Entire repository folder (excluding `node_modules/` if your instructor prefers you omit it—confirm course rules).
- **Data file:** Include `submission/sjc_threads_db_v1.json` (sample). On a device/simulator the live file is written beside app documents as **`sjc_threads_db_v1.json`** when the app runs.
- **Print/PDF:** Export this Markdown to PDF if your marker requires “1–2 pages”; length here targets ~two printed pages at normal margins.
