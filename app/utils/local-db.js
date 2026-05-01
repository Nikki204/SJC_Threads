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
      id: `thread_${uuid()}`,
      author_id: adminUserId,
      title: 'Welcome to SJC Threads',
      message: 'This version stores everything locally on your device. Create a post, react, and reply—no database required.',
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

