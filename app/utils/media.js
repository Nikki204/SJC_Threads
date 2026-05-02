import { knownFolders, ImageSource, File } from '@nativescript/core';
import { create as createImagePicker, ImagePickerMediaType } from '@nativescript/imagepicker';
import * as camera from '@nativescript/camera';

export const AVATAR_FOLDER = 'avatars';
export const THREAD_ATTACH_FOLDER = 'thread_attach';

export function resolveDocFilePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const root = knownFolders.documents().path.replace(/[/\\]+$/, '');
  const rel = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  return `${root}/${rel}`;
}

/** Paths stored in JSON are relative to the app documents folder (e.g. `avatars/user_x.jpg`). */
export function toRelativeDocumentsPath(fullPath) {
  if (!fullPath) return null;
  const root = knownFolders.documents().path.replace(/[/\\]+$/, '').replace(/\\/g, '/');
  const norm = fullPath.replace(/\\/g, '/');
  if (norm.startsWith(root)) {
    return norm.slice(root.length).replace(/^[/]+/, '');
  }
  return null;
}

function ensureFolder(name) {
  knownFolders.documents().getFolder(name);
}

function safeUserFileToken(userId) {
  return (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function pickAvatarFromGallery(userId) {
  ensureFolder(AVATAR_FOLDER);
  const token = safeUserFileToken(userId);
  const picker = createImagePicker({
    mode: 'single',
    mediaType: ImagePickerMediaType.Image,
    copyToAppFolder: AVATAR_FOLDER,
    renameFileTo: `${token}.jpg`,
    android: { read_external_storage: 'Select a photo for your profile.' }
  });

  const auth = await picker.authorize();
  if (!auth.authorized) {
    throw new Error('Photo library access was denied.');
  }

  const selection = await picker.present();
  if (!selection || selection.length === 0) return null;

  return toRelativeDocumentsPath(selection[0].path);
}

export async function captureAvatarWithCamera(userId) {
  const perm = await camera.requestPermissions();
  if (!perm || !perm.Success) {
    throw new Error('Camera permission was denied.');
  }
  if (typeof camera.isAvailable === 'function' && !camera.isAvailable()) {
    throw new Error('Camera is not available on this device.');
  }

  ensureFolder(AVATAR_FOLDER);
  const token = safeUserFileToken(userId);
  const rel = `${AVATAR_FOLDER}/${token}.jpg`;
  const full = resolveDocFilePath(rel);

  const asset = await camera.takePicture({
    width: 1024,
    keepAspectRatio: true,
    saveToGallery: false,
    cameraFacing: 'front'
  });

  const source = await ImageSource.fromAsset(asset);
  source.saveToFile(full, 'jpeg', 82);

  return rel;
}

/**
 * @param {number} maxPick - max images to pick in this session
 */
export async function captureThreadPhoto() {
  const perm = await camera.requestPermissions();
  if (!perm || !perm.Success) {
    throw new Error('Camera permission was denied.');
  }
  if (typeof camera.isAvailable === 'function' && !camera.isAvailable()) {
    throw new Error('Camera is not available on this device.');
  }

  ensureFolder(THREAD_ATTACH_FOLDER);
  const name = `cam_${Date.now()}.jpg`;
  const rel = `${THREAD_ATTACH_FOLDER}/${name}`;
  const full = resolveDocFilePath(rel);

  const asset = await camera.takePicture({
    width: 1600,
    keepAspectRatio: true,
    saveToGallery: false,
    cameraFacing: 'rear'
  });

  const source = await ImageSource.fromAsset(asset);
  source.saveToFile(full, 'jpeg', 82);

  return rel;
}

export async function pickThreadImages(maxPick) {
  if (maxPick < 1) return [];

  ensureFolder(THREAD_ATTACH_FOLDER);
  const picker = createImagePicker({
    mode: 'multiple',
    maximumNumberOfSelection: maxPick,
    mediaType: ImagePickerMediaType.Image,
    copyToAppFolder: THREAD_ATTACH_FOLDER,
    android: {
      read_external_storage: 'Attach photos to your thread.',
      use_photo_picker: true
    }
  });

  const auth = await picker.authorize();
  if (!auth.authorized) {
    throw new Error('Photo library access was denied.');
  }

  const selection = await picker.present();
  if (!selection || selection.length === 0) return [];

  const paths = [];
  for (const item of selection) {
    const rel = toRelativeDocumentsPath(item.path);
    if (rel) paths.push(rel);
  }
  return paths;
}

export function deleteFilesIfExist(relativePaths) {
  if (!relativePaths || !relativePaths.length) return;
  for (const rel of relativePaths) {
    try {
      const full = resolveDocFilePath(rel);
      if (!full || !File.exists(full)) continue;
      const f = File.fromPath(full);
      f.removeSync();
    } catch (_) {
      /* ignore */
    }
  }
}
