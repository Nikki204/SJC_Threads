import { Frame } from '@nativescript/core';
import { authService } from '../utils/auth';

let pageRef = null;

export function onNavigatingTo(args) {
  const page = args.object;
  pageRef = page;
  loadProfile();
}

async function loadProfile() {
  const profile = authService.currentProfile;
  const user = authService.currentUser;
  if (!profile || !user) return;

  const avatar = pageRef.getViewById('avatarInitial');
  const displayName = pageRef.getViewById('displayName');
  const username = pageRef.getViewById('username');
  const bio = pageRef.getViewById('bio');
  const editDisplayName = pageRef.getViewById('editDisplayName');
  const editUsername = pageRef.getViewById('editUsername');
  const editBio = pageRef.getViewById('editBio');
  const emailLabel = pageRef.getViewById('emailLabel');
  const joinedLabel = pageRef.getViewById('joinedLabel');

  const initial = (profile.display_name || profile.username || '?')[0].toUpperCase();
  avatar.text = initial;
  displayName.text = profile.display_name || 'No name set';
  username.text = `@${profile.username}`;
  bio.text = profile.bio || 'No bio yet';

  editDisplayName.text = profile.display_name || '';
  editUsername.text = profile.username || '';
  editBio.text = profile.bio || '';

  emailLabel.text = `Email: ${user.email || 'N/A'}`;
  const joinDate = new Date(profile.created_at);
  joinedLabel.text = `Joined: ${joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

export async function onSave() {
  const editDisplayName = pageRef.getViewById('editDisplayName');
  const editUsername = pageRef.getViewById('editUsername');
  const editBio = pageRef.getViewById('editBio');
  const loading = pageRef.getViewById('loading');
  const successLabel = pageRef.getViewById('success');
  const errorLabel = pageRef.getViewById('error');

  const displayName = editDisplayName.text.trim();
  const username = editUsername.text.trim();
  const bio = editBio.text.trim();

  successLabel.text = '';
  errorLabel.text = '';

  if (!displayName) {
    errorLabel.text = 'Display name is required';
    return;
  }
  if (!username) {
    errorLabel.text = 'Username is required';
    return;
  }

  loading.busy = true;

  try {
    await authService.updateProfile({
      display_name: displayName,
      username,
      bio
    });
    successLabel.text = 'Profile updated!';
    loadProfile();
  } catch (err) {
    errorLabel.text = err.message || 'Failed to update profile';
  } finally {
    loading.busy = false;
  }
}

export async function onSignOut() {
  try {
    await authService.signOut();
    Frame.topmost().navigate({
      moduleName: 'views/login-page',
      clearHistory: true
    });
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

export function onBack() {
  Frame.topmost().goBack();
}
