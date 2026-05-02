import { Frame, StackLayout, Image, Button, Dialogs } from '@nativescript/core';
import { createThread } from '../utils/data';
import {
  pickThreadImages,
  captureThreadPhoto,
  deleteFilesIfExist,
  resolveDocFilePath
} from '../utils/media';

let pageRef = null;
let selectedCategory = 'general';
const MAX_ATTACH = 4;
let pendingAttachments = [];

export function onNavigatingTo(args) {
  const page = args.object;
  pageRef = page;
  page.bindingContext = {};
  pendingAttachments = [];
  rebuildAttachmentPreview();
}

function rebuildAttachmentPreview() {
  const preview = pageRef.getViewById('attachmentPreview');
  const scroll = pageRef.getViewById('attachmentScroll');
  if (!preview || !scroll) return;
  preview.removeChildren();

  if (pendingAttachments.length === 0) {
    scroll.visibility = 'collapsed';
    return;
  }
  scroll.visibility = 'visible';

  pendingAttachments.forEach(rel => {
    const row = new StackLayout();
    row.orientation = 'horizontal';
    row.marginRight = 8;
    row.verticalAlignment = 'middle';

    const img = new Image();
    img.src = resolveDocFilePath(rel);
    img.width = 72;
    img.height = 72;
    img.stretch = 'aspectFill';
    img.className = 'compose-attach-thumb';

    const removeBtn = new Button();
    removeBtn.text = '✕';
    removeBtn.className = 'btn-danger btn-small';
    removeBtn.marginLeft = 4;
    removeBtn.on('tap', () => {
      deleteFilesIfExist([rel]);
      pendingAttachments = pendingAttachments.filter(r => r !== rel);
      rebuildAttachmentPreview();
    });

    row.addChild(img);
    row.addChild(removeBtn);
    preview.addChild(row);
  });
}

export function onSelectCategory(args) {
  const btn = args.object;
  const id = btn.id;
  const category = id.replace('cat-', '');

  const categories = ['question', 'idea', 'announcement', 'general'];
  categories.forEach(cat => {
    const catBtn = pageRef.getViewById(`cat-${cat}`);
    if (catBtn) {
      catBtn.className = cat === category ? 'category-select-btn active' : 'category-select-btn';
    }
  });

  selectedCategory = category;
}

export async function onAttachGallery() {
  const remaining = MAX_ATTACH - pendingAttachments.length;
  if (remaining < 1) {
    Dialogs.alert({ title: 'Photos', message: 'You can attach up to 4 photos.', okButtonText: 'OK' });
    return;
  }
  try {
    const picked = await pickThreadImages(remaining);
    if (!picked.length) return;
    pendingAttachments = pendingAttachments.concat(picked);
    rebuildAttachmentPreview();
  } catch (err) {
    Dialogs.alert({
      title: 'Gallery',
      message: err.message || 'Could not add photos.',
      okButtonText: 'OK'
    });
  }
}

export async function onAttachCamera() {
  const remaining = MAX_ATTACH - pendingAttachments.length;
  if (remaining < 1) {
    Dialogs.alert({ title: 'Photos', message: 'You can attach up to 4 photos.', okButtonText: 'OK' });
    return;
  }
  try {
    const rel = await captureThreadPhoto();
    if (rel) {
      pendingAttachments.push(rel);
      rebuildAttachmentPreview();
    }
  } catch (err) {
    Dialogs.alert({
      title: 'Camera',
      message: err.message || 'Could not capture a photo.',
      okButtonText: 'OK'
    });
  }
}

export async function onPost(args) {
  const titleInput = pageRef.getViewById('titleInput');
  const messageInput = pageRef.getViewById('messageInput');
  const errorLabel = pageRef.getViewById('error');
  const loading = pageRef.getViewById('loading');

  const title = titleInput.text.trim();
  const message = messageInput.text.trim();

  errorLabel.text = '';

  if (!title) {
    errorLabel.text = 'Title is required';
    return;
  }
  if (!message) {
    errorLabel.text = 'Message is required';
    return;
  }

  loading.busy = true;

  try {
    await createThread(title, message, selectedCategory, pendingAttachments.slice());
    pendingAttachments = [];
    Frame.topmost().goBack();
  } catch (err) {
    errorLabel.text = err.message || 'Failed to create thread';
  } finally {
    loading.busy = false;
  }
}

export function onCancel() {
  deleteFilesIfExist(pendingAttachments);
  pendingAttachments = [];
  Frame.topmost().goBack();
}
