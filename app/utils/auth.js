import { Observable, ApplicationSettings } from '@nativescript/core';
import { localDb } from './local-db';

class AuthService extends Observable {
  constructor() {
    super();
    this._currentUser = null;
    this._currentProfile = null;
    this._hydrateFromSession();
  }

  get currentUser() { return this._currentUser; }
  get currentProfile() { return this._currentProfile; }
  get isLoggedIn() { return !!this._currentUser; }

  async signUp(email, password, username, displayName) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedUsername = (username || '').trim().toLowerCase();
    if (!normalizedEmail || !password || !normalizedUsername) {
      throw new Error('All fields are required');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const created = await localDb.transaction(async (db, { uuid, nowIso }) => {
      const emailExists = db.users.some(u => (u.email || '').toLowerCase() === normalizedEmail);
      if (emailExists) throw new Error('Email already registered');

      const usernameExists = db.profiles.some(p => (p.username || '').toLowerCase() === normalizedUsername);
      if (usernameExists) throw new Error('Username already taken');

      const id = `user_${uuid()}`;
      const ts = nowIso();
      db.users.push({
        id,
        email: normalizedEmail,
        password,
        created_at: ts,
        updated_at: ts
      });
      db.profiles.push({
        id,
        username: normalizedUsername,
        display_name: (displayName || normalizedUsername).trim(),
        avatar_url: null,
        bio: '',
        created_at: ts,
        updated_at: ts
      });

      return { user: { id, email: normalizedEmail } };
    });

    await this._setSession(created.user.id);
    return { user: created.user };
  }

  async signIn(email, password) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const db = await localDb.load();
    const found = db.users.find(u => (u.email || '').toLowerCase() === normalizedEmail);
    if (!found || found.password !== password) {
      throw new Error('Invalid email or password');
    }

    await this._setSession(found.id);
    return { user: { id: found.id, email: found.email } };
  }

  async signOut() {
    ApplicationSettings.remove('session_user_id');
    this._currentUser = null;
    this._currentProfile = null;
    this.notifyPropertyChange('isLoggedIn', false);
    this.notifyPropertyChange('currentUser', null);
    this.notifyPropertyChange('currentProfile', null);
  }

  async loadProfile(userId) {
    const db = await localDb.load();
    const profile = db.profiles.find(p => p.id === userId) || null;
    this._currentProfile = profile;
  }

  async updateProfile(updates) {
    if (!this._currentUser) throw new Error('Not logged in');

    const updated = await localDb.transaction(async (db, { nowIso }) => {
      const idx = db.profiles.findIndex(p => p.id === this._currentUser.id);
      if (idx < 0) throw new Error('Profile not found');

      const nextUsername = (updates.username ?? db.profiles[idx].username ?? '').trim().toLowerCase();
      if (!nextUsername) throw new Error('Username is required');
      const usernameTaken = db.profiles.some(p => p.id !== this._currentUser.id && (p.username || '').toLowerCase() === nextUsername);
      if (usernameTaken) throw new Error('Username already taken');

      const next = {
        ...db.profiles[idx],
        ...updates,
        username: nextUsername,
        updated_at: nowIso()
      };
      db.profiles[idx] = next;
      return next;
    });

    this._currentProfile = updated;
    this.notifyPropertyChange('currentProfile', updated);
    return updated;
  }

  async _setSession(userId) {
    ApplicationSettings.setString('session_user_id', userId);
    const db = await localDb.load();
    const user = db.users.find(u => u.id === userId);
    this._currentUser = user ? { id: user.id, email: user.email } : null;
    await this.loadProfile(userId);
    this.notifyPropertyChange('isLoggedIn', !!this._currentUser);
    this.notifyPropertyChange('currentUser', this._currentUser);
    this.notifyPropertyChange('currentProfile', this._currentProfile);
  }

  async _hydrateFromSession() {
    const userId = ApplicationSettings.getString('session_user_id', '');
    if (!userId) return;
    try {
      await this._setSession(userId);
    } catch {
      ApplicationSettings.remove('session_user_id');
    }
  }
}

export const authService = new AuthService();
