import { knownFolders } from '@nativescript/core';

const DB_FILENAME = 'sjc_threads_db_v1.json';

function nowIso() {
  return new Date().toISOString();
}

function safeParseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function uuid() {
  // Good-enough unique id for local-only data
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Shown as the first “announcement” thread — full app overview for new users. */
export const WELCOME_THREAD_ID = 'thread_welcome_sjc';

export function welcomeTourThreadBody() {
  return [
    'Hey — thanks for checking out SJC Threads!',
    '',
    'Here’s what you can do in this app:',
    '',
    '• Feed — Scroll threads on Home. Filter by category (Questions, Ideas, Announcements, General). Tap any card to open it.',
    '• Thread detail — Read the full post. React with 👍 ❤️ 💡 👏 on the thread.',
    '• Comments — Leave a reply, reply to someone, and react on comments too.',
    '• New thread — Use “Start a new thread…” or the + button.',
    '• Profile — Tap Profile in the top bar (next to Logout) to open your profile.',
    '• Local mode — Everything stays on this device (great for demos / class projects).',
    '',
    'Dig in: ask a question, share an idea, or say hi below.',
    '',
    ':DD'
  ].join('\n');
}

function migrateWelcomeThread(db) {
  const threads = db.threads || [];
  const legacyTitle = 'Welcome to SJC Threads';
  const newTitle = 'Welcome to SJC Threads — app tour';
  const body = welcomeTourThreadBody();

  const idx = threads.findIndex(t => t.title === legacyTitle || t.title === newTitle);
  if (idx === -1) return false;

  const t = threads[idx];
  if (typeof t.message === 'string' && t.message.includes('Feed — Scroll threads')) {
    return false;
  }

  t.title = newTitle;
  t.message = body;
  t.category = 'announcement';
  t.updated_at = nowIso();
  return true;
}

function createSeedDb() {
  const createdAt = nowIso();
  const adminUserId = `user_${uuid()}`;

  const profiles = [
    {
      id: adminUserId,
      username: 'admin',
      display_name: 'SJC Admin',
      avatar_url: null,
      bio: 'Welcome to SJC Threads (local demo mode).',
      created_at: createdAt,
      updated_at: createdAt
    }
  ];

  const users = [
    {
      id: adminUserId,
      email: 'admin@local',
      password: 'admin123',
      created_at: createdAt,
      updated_at: createdAt
    }
  ];

  const threads = [
    {
      id: WELCOME_THREAD_ID,
      author_id: adminUserId,
      title: 'Welcome to SJC Threads — app tour',
      message: welcomeTourThreadBody(),
      category: 'announcement',
      created_at: createdAt,
      updated_at: createdAt
    }
  ];

  return {
    meta: { version: 1, created_at: createdAt, updated_at: createdAt },
    users,
    profiles,
    threads,
    comments: [],
    reactions: []
  };
}

function fileExistsCompat(file) {
  try {
    if (!file) return false;
    if (typeof file.exists === 'function') return !!file.exists();
    if (typeof file.exists === 'boolean') return file.exists;
    if (typeof file.path === 'string') {
      // If it has a path but no exists API, let readText determine existence
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export class LocalDb {
  constructor() {
    this._file = knownFolders.documents().getFile(DB_FILENAME);
    this._cache = null;
    this._writePromise = Promise.resolve();
  }

  async load() {
    if (this._cache) return this._cache;
    const exists = fileExistsCompat(this._file);
    let text = '';
    if (exists) {
      try {
        text = await this._file.readText();
      } catch {
        text = '';
      }
    }

    const parsed = safeParseJson(text, null);
    if (!parsed || typeof parsed !== 'object') {
      const seed = createSeedDb();
      await this._file.writeText(JSON.stringify(seed, null, 2));
      this._cache = seed;
      return this._cache;
    }

    // Basic shape repair (in case older file exists)
    parsed.meta ||= { version: 1, created_at: nowIso(), updated_at: nowIso() };
    parsed.users ||= [];
    parsed.profiles ||= [];
    parsed.threads ||= [];
    parsed.comments ||= [];
    parsed.reactions ||= [];

    if (migrateWelcomeThread(parsed)) {
      await this.save(parsed);
    }

    this._cache = parsed;
    return this._cache;
  }

  async save(db) {
    db.meta ||= { version: 1, created_at: nowIso(), updated_at: nowIso() };
    db.meta.updated_at = nowIso();
    this._cache = db;

    // Serialize writes to avoid interleaving
    this._writePromise = this._writePromise.then(() =>
      this._file.writeText(JSON.stringify(db, null, 2))
    );
    await this._writePromise;
  }

  async transaction(mutator) {
    const db = await this.load();
    const copy = safeParseJson(JSON.stringify(db), createSeedDb());
    const result = await mutator(copy, { uuid, nowIso });
    await this.save(copy);
    return result;
  }
}

export const localDb = new LocalDb();

