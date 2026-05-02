# SJC Threads - Design Documentation

## 1. Project Overview

SJC Threads is a NativeScript mobile app for St. John's College community discussion. The app is intentionally similar to Instagram or Threads in the way it centers people, posts, comments, reactions, and profile previews, but it keeps the scope local and campus-focused. Instead of a public social network backed by a remote server, this project stores its data on the device in a local JSON database.

The app is designed for students, faculty, and staff who want a lightweight place to ask questions, share ideas, post announcements, and keep up with recent campus activity. It is also designed as a coursework-friendly prototype: the code is easy to inspect, the data model is transparent, and each feature maps clearly to a specific screen and utility module.

## 2. Goals

The main goals are:

- Provide a clean local social feed for SJC-style discussion.
- Let users register, sign in, edit a profile, and add a profile photo.
- Let users create threads with categories and optional photos.
- Let users comment, reply, and react to threads and comments.
- Keep the newest and most active conversations visible at the top of the feed.
- Keep all app data local so the project can run without an external backend.
- Use a consistent navy and white visual identity that fits the SJC branding.

## 3. Target Users

The primary users are SJC students and staff. The intended usage is small-scale and familiar: users likely know each other from classes, clubs, offices, or campus events. Because of that, the interface favors quick reading and participation over heavy discovery features.

Typical users may:

- Ask a question about assignments, events, or campus services.
- Share an idea for a class, club, or student activity.
- Post an announcement.
- Browse latest conversations by category.
- Tap an author's name to learn a little more about that person.
- React quickly without writing a full comment.

## 4. Requirement Checklist

| Requirement | Implementation |
| --- | --- |
| Create a thread with title and message | `app/views/create-thread-page.xml` and `create-thread-page.js` collect title, message, category, and optional photos. `createThread()` in `app/utils/data.js` stores the thread. |
| Comment on threads | `thread-detail-page.js` creates comments through `createComment()`. Comments are stored with `thread_id` and optional `parent_comment_id`. |
| Reply to comments | The Reply button sets `_replyToCommentId` on the reply input, and `createComment()` stores the parent comment id. `buildCommentTree()` renders nested replies. |
| React to posts and comments | `toggleReaction()` stores one reaction record per user, target, and reaction type. The UI supports like, love, idea, and clap reactions. |
| List threads by latest activity | `fetchThreads()` sorts by `updated_at`, falling back to `created_at`. New comments and reaction changes update the parent thread timestamp. |
| Edit user profile | `profile-page.js` updates display name, username, bio, and avatar through `authService.updateProfile()`. |
| View profile popup | `profile-preview-page.xml/js` opens as a modal from author names in thread detail and comments, showing avatar, name, handle, bio, join date, and activity totals. |
| Use at least two plugins/dependencies | The app uses NativeScript packages including `@nativescript/theme`, `@nativescript/webpack`, `@nativescript/camera`, and `@nativescript/imagepicker`. |
| Store posts and comments locally | `LocalDb` in `app/utils/local-db.js` reads/writes `sjc_threads_db_v1.json` in the app documents folder. |

## 5. Feature Inventory

### Authentication

The app includes local sign in and registration. Users provide a display name, username, email, and password. A session user id is stored using NativeScript `ApplicationSettings`, allowing the app to remember the current signed-in user.

Important implementation files:

- `app/views/login-page.xml`
- `app/views/login-page.js`
- `app/views/register-page.xml`
- `app/views/register-page.js`
- `app/utils/auth.js`
- `app/utils/local-db.js`

This is local prototype authentication. Passwords are stored in the local JSON demo database and should not be treated as production security. A real deployment would replace this with a backend authentication service, hashed passwords, account recovery, validation rules, and server-side access control.

### Home Feed

The home page is the main browsing screen. It shows a welcome header, compose prompt, category filters, and a list of thread cards. Each card shows:

- Category badge
- Latest activity time
- Thread title
- Message preview
- Optional thumbnail if the thread has an attached image
- Author display name
- Reply and reaction totals

The feed uses `fetchThreads()` to load data and then maps each thread into a display-friendly object. Category buttons filter the in-memory list by `question`, `idea`, `announcement`, or `general`.

### Thread Detail

The thread detail screen shows the full post, author, timestamp, image attachments, thread reactions, comments, nested replies, and the reply input bar. Author names in the thread header and comment headers are tappable and open the profile preview modal.

Key behaviors:

- The full post is loaded with `fetchThreadById()`.
- Thread reactions are loaded with `fetchThreadReactions()`.
- Comments are loaded with `fetchComments()`.
- Comment reactions are loaded with `fetchCommentReactions()`.
- Comments are converted into nested display format with `buildCommentTree()`.
- Reaction buttons update immediately after toggling.

### Create Thread

The create screen allows a user to pick a category, enter a title, enter a message, and optionally attach up to four photos. Photos can be selected from the device gallery or captured with the camera.

Attached image paths are stored relative to the app documents folder, such as `thread_attach/cam_123.jpg`. This keeps the JSON portable within the local app data structure.

### Profile Editing

The profile page is for the signed-in user. It includes:

- Avatar preview
- Gallery, camera, and remove avatar actions
- Display name
- Username
- Bio
- Email and joined date
- Save changes
- Sign out

Avatar images are saved in the `avatars` folder under app documents. When a profile photo changes or is removed, the previous local file is deleted where possible.

### Profile Preview Modal

The profile preview modal was updated to feel more like a polished social app profile popup. It now includes:

- Bottom-sheet style layout with dimmed backdrop
- Drag handle visual
- Header row with label and close button
- Avatar image or fallback initial
- Display name and username
- Activity totals for threads, comments, and received reactions
- About section with safe empty text
- Joined date
- Full-width close action

The stats are calculated by `fetchProfileSummary(userId)` in `app/utils/data.js`. It counts authored threads, authored comments, and reactions received on that user's threads and comments.

## 6. Data Design

The app uses one local JSON file named `sjc_threads_db_v1.json`. The live file is created inside the NativeScript app documents directory. A sample file is included in `submission/sjc_threads_db_v1.json`.

Top-level structure:

```json
{
  "meta": {},
  "users": [],
  "profiles": [],
  "threads": [],
  "comments": [],
  "reactions": []
}
```

### users

Stores sign-in credentials and account timestamps.

Main fields:

- `id`
- `email`
- `password`
- `created_at`
- `updated_at`

### profiles

Stores public profile information. Profile ids match user ids, which makes it easy to join user-owned content to profile display data.

Main fields:

- `id`
- `username`
- `display_name`
- `avatar_url`
- `bio`
- `created_at`
- `updated_at`

### threads

Stores top-level posts.

Main fields:

- `id`
- `author_id`
- `title`
- `message`
- `category`
- `image_urls`
- `created_at`
- `updated_at`

### comments

Stores comments and replies. A normal comment has `parent_comment_id: null`. A reply stores the id of the comment it belongs to.

Main fields:

- `id`
- `thread_id`
- `author_id`
- `message`
- `parent_comment_id`
- `created_at`
- `updated_at`

### reactions

Stores reactions for both threads and comments.

Main fields:

- `id`
- `user_id`
- `target_id`
- `target_type`
- `reaction_type`
- `created_at`

`target_type` is either `thread` or `comment`. `reaction_type` is one of `like`, `love`, `idea`, or `clap`.

## 7. Architecture

The app uses a simple layered structure:

```text
NativeScript XML views
        |
JavaScript page handlers
        |
auth.js / data.js / media.js
        |
local-db.js
        |
sjc_threads_db_v1.json + local image files
```

### UI Layer

Files in `app/views` define screen layouts in XML and screen behavior in JavaScript. The XML files focus on structure and CSS classes. The JavaScript files handle navigation, input validation, loading state, data calls, and dynamic rendering.

### Service Layer

`app/utils/auth.js` handles sign up, sign in, sign out, session hydration, and profile updates.

`app/utils/data.js` handles thread, comment, reaction, sorting, profile lookup, and profile summary behavior.

`app/utils/media.js` handles gallery selection, camera capture, document-folder paths, relative file paths, and cleanup of unused image files.

### Persistence Layer

`app/utils/local-db.js` handles loading, seeding, migrating, saving, and transaction-style updates. Mutations are made against a copied database object and then saved back to disk. Writes are queued through `_writePromise` to reduce the risk of overlapping file writes during fast taps.

## 8. Navigation Flow

The root frame starts at `views/login-page`.

Common navigation paths:

- Login -> Home
- Register -> Home
- Home -> New Thread
- Home -> Profile
- Home -> Thread Detail
- Thread Detail -> Profile Preview modal
- Thread Detail -> Back to Home
- Profile -> Back to Home
- Profile or Home -> Sign Out -> Login

## 9. Visual Design System

The design is built around a clean SJC navy and white identity. The primary color family is navy, supported by white surfaces, soft blue backgrounds, and category/reaction accent colors.

Important style groups in `app/app.css`:

- Global variables on `Frame` and `Page`
- Action bar and nav styling
- Auth screen layout
- Home header and compose prompt
- Thread cards
- Category badges and filter buttons
- Reaction buttons
- Comment rows and nested reply styling
- Profile header and avatar styles
- Profile preview modal styles
- Form fields and primary/secondary/danger buttons

The app forces a light theme through `@nativescript/theme` in `app/app.js`. This avoids device dark mode overriding the intended white and navy interface.

## 10. Plugins And Packages

### `@nativescript/core`

Core NativeScript runtime and UI APIs. Used for `Frame`, `Observable`, `ObservableArray`, views, file access, dialogs, image handling, and app settings.

### `@nativescript/theme`

Used to force light mode and keep the custom CSS predictable across platforms.

### `@nativescript/webpack`

NativeScript build tooling for bundling XML, JavaScript, CSS, and assets.

### `@nativescript/camera`

Used for taking profile photos and thread attachment photos from the device camera.

### `@nativescript/imagepicker`

Used for selecting avatar images and thread attachments from the device gallery.

### Development tooling

The project also includes `@nativescript/preview-cli`, `@nativescript/stackblitz`, `@nativescript/tailwind`, and `tailwindcss`. The current UI is primarily styled through `app/app.css`, but these tools support preview/build workflows and future styling options.

## 11. Local Privacy Model

SJC Threads is local-only in this version. That means:

- No remote server is used.
- No API requests are required for app data.
- Threads, comments, profiles, users, and reactions are stored on the device.
- Photos are copied or saved into app document folders.
- A reset or app data clear may remove the live local database.

This model is useful for coursework demos because it removes backend setup. It is not a full production privacy or moderation model. A real campus deployment would need backend authentication, moderation tools, reporting, content deletion policies, backups, and role-based admin access.

## 12. Seed Data And Migrations

When the app starts with no valid database, `LocalDb` creates a seed database. It includes:

- Demo admin account: `admin@local`
- Demo password: `admin123`
- Admin profile: `SJC Admin`
- Welcome tour announcement thread

`local-db.js` also performs lightweight migrations:

- Ensures all top-level arrays exist.
- Ensures threads have an `image_urls` array.
- Updates the welcome thread text if an older seed version exists.

## 13. Recent UI Updates

The profile preview popup was improved because it is an important social UI element. Users should be able to quickly understand who posted something without leaving the thread. The updated modal now has stronger structure, clearer close controls, better spacing, an About area, and activity stats.

CSS additions include:

- `.profile-modal-topbar`
- `.profile-modal-eyebrow`
- `.profile-modal-close`
- `.profile-modal-stats`
- `.profile-modal-stat-number`
- `.profile-modal-stat-label`
- `.profile-modal-bio-box`
- `.profile-modal-section-label`
- `.profile-modal-primary-close`

Data additions include:

- `fetchProfileSummary(userId)` in `app/utils/data.js`

## 14. Known Limitations

- Data is local to one device and is not synced between users.
- Passwords are stored in the local JSON prototype database.
- There is no admin moderation screen.
- There is no search feature yet.
- There are no push notifications.
- There is no server-side validation.
- Profile preview is read-only.
- Deleting threads/comments exists in the data layer but is not fully exposed as a polished user-facing workflow.

## 15. Future Improvements

Strong next steps would be:

- Replace local auth with a secure backend.
- Add search across threads and comments.
- Add user follow or campus group features.
- Add notifications for replies and reactions.
- Add moderation, reporting, and content removal tools.
- Add edit/delete controls in the UI for a user's own content.
- Add richer image viewing for thread attachments.
- Add basic test coverage for the data utilities.

## 16. Reflection

The biggest design challenge was balancing a familiar social-app feel with the simplicity of a local coursework project. The app needed enough interaction to feel real - threads, replies, reactions, photos, profiles - without becoming dependent on a backend or complex infrastructure. The local JSON database solved that by making the data easy to inspect and easy to reset.

The biggest technical challenge was keeping NativeScript styling consistent across pages and device settings. Forcing light mode, centralizing style tokens in `app/app.css`, and using repeated UI classes helped keep the design coherent. Another important challenge was feed ordering. The solution was to treat comments and reactions as activity that updates the parent thread, so the home feed behaves like users expect from a discussion app.

The project now has a stronger profile popup and fuller documentation, which makes the social layer clearer for both users and reviewers.
