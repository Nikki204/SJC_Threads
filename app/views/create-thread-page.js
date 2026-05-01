import { Frame } from '@nativescript/core';
import { createThread } from '../utils/data';

let pageRef = null;
let selectedCategory = 'general';

export function onNavigatingTo(args) {
  const page = args.object;
  pageRef = page;
  page.bindingContext = {};
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
    await createThread(title, message, selectedCategory);
    Frame.topmost().goBack();
  } catch (err) {
    errorLabel.text = err.message || 'Failed to create thread';
  } finally {
    loading.busy = false;
  }
}

export function onCancel() {
  Frame.topmost().goBack();
}
