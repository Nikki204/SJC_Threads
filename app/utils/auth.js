import { supabase } from './supabase';
import { Observable } from '@nativescript/core';

class AuthService extends Observable {
  constructor() {
    super();
    this._currentUser = null;
    this._currentProfile = null;

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session && session.user) {
          this._currentUser = session.user;
          await this.loadProfile(session.user.id);
          this.notifyPropertyChange('isLoggedIn', true);
          this.notifyPropertyChange('currentUser', this._currentUser);
          this.notifyPropertyChange('currentProfile', this._currentProfile);
        } else {
          this._currentUser = null;
          this._currentProfile = null;
          this.notifyPropertyChange('isLoggedIn', false);
          this.notifyPropertyChange('currentUser', null);
          this.notifyPropertyChange('currentProfile', null);
        }
      })();
    });
  }

  get currentUser() { return this._currentUser; }
  get currentProfile() { return this._currentProfile; }
  get isLoggedIn() { return !!this._currentUser; }

  async signUp(email, password, username, displayName) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          display_name: displayName || username
        });
      if (profileError) throw profileError;
    }
    return data;
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this._currentUser = null;
    this._currentProfile = null;
    this.notifyPropertyChange('isLoggedIn', false);
  }

  async loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    this._currentProfile = data;
  }

  async updateProfile(updates) {
    if (!this._currentUser) throw new Error('Not logged in');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', this._currentUser.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    this._currentProfile = data;
    this.notifyPropertyChange('currentProfile', data);
    return data;
  }
}

export const authService = new AuthService();
