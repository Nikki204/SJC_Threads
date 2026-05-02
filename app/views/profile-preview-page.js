import { File } from '@nativescript/core';
import { fetchProfileByUserId } from '../utils/data';
import { resolveDocFilePath } from '../utils/media';

export async function onShownModally(args) {
  const page = args.object;
  const userId = args.context?.userId;
  const img = page.getViewById('modalAvatarImage');
  const initial = page.getViewById('modalAvatarInitial');
  const displayName = page.getViewById('modalDisplayName');
  const username = page.getViewById('modalUsername');
  const bio = page.getViewById('modalBio');
  const joined = page.getViewById('modalJoined');

  try {
    const profile = await fetchProfileByUserId(userId);
    if (!profile) {
      displayName.text = 'Unknown user';
      username.text = '';
      bio.text = 'This profile could not be loaded.';
      joined.text = '';
      initial.text = '?';
      img.visibility = 'collapsed';
      initial.visibility = 'visible';
      return;
    }

    const letter = (profile.display_name || profile.username || '?')[0].toUpperCase();
    initial.text = letter;

    const avatarPath = profile.avatar_url ? resolveDocFilePath(profile.avatar_url) : null;
    if (avatarPath && File.exists(avatarPath)) {
      img.src = avatarPath;
      img.visibility = 'visible';
      initial.visibility = 'collapsed';
    } else {
      img.visibility = 'collapsed';
      initial.visibility = 'visible';
    }

    displayName.text = profile.display_name || 'No name';
    username.text = `@${profile.username || 'user'}`;
    bio.text = profile.bio || 'No bio yet.';
    const jd = new Date(profile.created_at);
    joined.text = `Joined ${jd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  } catch (e) {
    console.error(e);
    displayName.text = 'Profile';
    bio.text = 'Something went wrong loading this profile.';
  }
}

export function onClose(args) {
  args.object.page.closeModal();
}

export function onBackdropTap(args) {
  args.object.page.closeModal();
}
