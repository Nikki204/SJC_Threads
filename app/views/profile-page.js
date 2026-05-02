import { Frame, File, Dialogs } from '@nativescript/core';
import { authService } from '../utils/auth';
import {
  pickAvatarFromGallery,
  captureAvatarWithCamera,
  resolveDocFilePath,
  deleteFilesIfExist
} from '../utils/media';

let pageRef = null;

export function onNavigatingTo(args) {
  const page = args.object;
  pageRef = page;
  loadProfile();
}

function applyAvatarUi(profile) {
  const avatarImg = pageRef.getViewById('avatarImage');
  const avatarInitial = pageRef.getViewById('avatarInitial');
  const path = profile?.avatar_url ? resolveDocFilePath(profile.avatar_url) : null;
  if (path && File.exists(path)) {
    avatarImg.src = path;
    avatarImg.visibility = 'visible';
    avatarInitial.visibility = 'collapsed';
  } else {
    avatarImg.visibility = 'collapsed';
    avatarInitial.visibility = 'visible';
  }
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

  applyAvatarUi(profile);
}

export async function onPickGallery() {
  const user = authService.currentUser;
  const prevRel = authService.currentProfile?.avatar_url || null;
  if (!user) return;
  try {
    const rel = await pickAvatarFromGallery(user.id);
    if (!rel) return;
    await authService.updateProfile({ avatar_url: rel });
    if (prevRel && prevRel !== rel) deleteFilesIfExist([prevRel]);
    loadProfile();
  } catch (err) {
    Dialogs.alert({
      title: 'Gallery',
      message: err.message || 'Could not pick a photo.',
      okButtonText: 'OK'
    });
  }
}

export async function onTakePhoto() {
  const user = authService.currentUser;
  const prevRel = authService.currentProfile?.avatar_url || null;
  if (!user) return;
  try {
    const rel = await captureAvatarWithCamera(user.id);
    if (!rel) return;
    await authService.updateProfile({ avatar_url: rel });
    if (prevRel && prevRel !== rel) deleteFilesIfExist([prevRel]);
    loadProfile();
  } catch (err) {
    Dialogs.alert({
      title: 'Camera',
      message: err.message || 'Could not capture a photo.',
      okButtonText: 'OK'
    });
  }
}

export async function onRemoveAvatar() {
  const prevRel = authService.currentProfile?.avatar_url || null;
  if (!prevRel) return;
  try {
    await authService.updateProfile({ avatar_url: null });
    deleteFilesIfExist([prevRel]);
    loadProfile();
  } catch (err) {
    Dialogs.alert({
      title: 'Profile photo',
      message: err.message || 'Could not remove photo.',
      okButtonText: 'OK'
    });
  }
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
