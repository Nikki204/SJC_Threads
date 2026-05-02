# SJC Threads

SJC Threads is a local-first NativeScript mobile app for St. John's College community discussion. It works like a small campus version of a social thread app: users can sign in, create posts, attach photos, comment, reply, react, edit profiles, and preview other users' profiles.

All app data is stored locally on the device in `sjc_threads_db_v1.json`.

## Demo Account

When the app creates a new local database, it seeds one demo user:

```text
Email: admin@local
Password: admin123
```

You can also create your own account from the registration screen.

## Running The App

Install dependencies:

```bash
npm install
```

Run with your NativeScript workflow, for example:

```bash
ns preview
```

or run on a connected Android device/emulator:

```bash
ns run android
```

The project uses NativeScript 8 packages. You may need the NativeScript CLI installed globally:

```bash
npm install -g nativescript
```

## User Guide

### 1. Sign In

Open the app and enter an email and password. Use the demo account above or tap Create Account to register a new local user.

### 2. Create An Account

On the registration screen, enter:

- Display name
- Username
- Email
- Password
- Confirm password

Passwords must be at least 6 characters. After registration, the app takes you to the home feed.

### 3. Browse The Home Feed

The home feed shows the latest active threads. A thread moves up when someone comments or reacts. Each card shows the category, title, preview text, author, time, replies, and reactions.

Use the category buttons to filter by:

- All
- Questions
- Ideas
- Announcements
- General

Tap a thread card to open the full discussion.

### 4. Start A Thread

From Home, tap Start a new thread or the plus button.

Choose a category, enter a title, and write your message. You can also attach up to four photos from the gallery or camera. Tap Post Thread to publish it locally.

### 5. Read And React To A Thread

On the thread detail screen, you can read the full post, view attachments, and react using:

- Like
- Love
- Idea
- Clap

Tap a reaction again to remove your reaction.

### 6. Comment And Reply

Use the reply bar at the bottom of a thread to write a comment. To reply to a specific comment, tap Reply under that comment. The input changes to show who you are replying to.

Comments can also receive reactions.

### 7. View A Profile Popup

In a thread, tap an author's name. A profile popup opens with:

- Avatar or initial
- Display name
- Username
- Thread count
- Comment count
- Reactions received
- Bio
- Joined date

Tap the backdrop, X button, or Close Profile to dismiss it.

### 8. Edit Your Profile

Open Profile from the home screen. You can update:

- Profile photo
- Display name
- Username
- Bio

Profile photos can come from the gallery or camera. Tap Save Changes to store edits locally.

### 9. Sign Out

Use Logout from the home screen or Sign Out from the profile page. The app returns to the login screen.

## Project Structure

```text
app/
  app.js                    App startup and theme setup
  app.css                   Shared visual design system
  app-root.xml              Root NativeScript frame
  assets/                   Static images
  utils/
    auth.js                 Local sign in, registration, profile updates
    data.js                 Threads, comments, reactions, profile summaries
    local-db.js             JSON database load/save/seed/migration
    media.js                Camera, gallery, and local image paths
  views/
    login-page.*            Login screen
    register-page.*         Registration screen
    home-page.*             Feed and filters
    create-thread-page.*    Compose screen
    thread-detail-page.*    Thread, comments, replies, reactions
    profile-page.*          Current user's editable profile
    profile-preview-page.*  Public profile popup modal
submission/
  sjc_threads_db_v1.json    Sample local data file
DESIGN_DOCUMENTATION.md     Detailed design and architecture notes
```

## Data Storage

The live app database is created in the app documents folder as:

```text
sjc_threads_db_v1.json
```

The database stores users, profiles, threads, comments, and reactions. Images are saved in app document subfolders:

```text
avatars/
thread_attach/
```

This is a local prototype. It does not sync across devices and should not be treated as production authentication or storage.

## Main Dependencies

- `@nativescript/core`
- `@nativescript/theme`
- `@nativescript/webpack`
- `@nativescript/camera`
- `@nativescript/imagepicker`

## Notes For Reviewers

The app is intentionally local-only for easy demonstration and grading. The included submission JSON file is a sample database, while the app creates and updates its own live JSON file when running on a device or emulator.
