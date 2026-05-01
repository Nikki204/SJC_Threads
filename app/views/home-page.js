import { Observable, ObservableArray, Frame } from '@nativescript/core';
import { authService } from '../utils/auth';
import { fetchThreads, formatTimeAgo } from '../utils/data';

let pageRef = null;
let currentCategory = 'all';

export function onNavigatingTo(args) {
  const page = args.object;
  pageRef = page;
  page.bindingContext = createViewModel();
}

export function onLoaded(args) {
  loadThreads();
}

function createViewModel() {
  const vm = new Observable();
  vm.threads = new ObservableArray();
  return vm;
}

async function loadThreads() {
  if (!pageRef) return;
  const vm = pageRef.bindingContext;
  const loading = pageRef.getViewById('loading');
  const emptyState = pageRef.getViewById('emptyState');

  loading.busy = true;
  emptyState.visibility = 'collapsed';

  try {
    const threads = await fetchThreads();
    const filtered = currentCategory === 'all'
      ? threads
      : threads.filter(t => t.category === currentCategory);

    const mapped = filtered.map(t => ({
      id: t.id,
      title: t.title,
      messagePreview: t.message ? (t.message.length > 120 ? t.message.substring(0, 120) + '...' : t.message) : '',
      category: t.category,
      authorName: t.profiles?.display_name || t.profiles?.username || 'Unknown',
      timeAgo: formatTimeAgo(t.updated_at || t.created_at),
      commentCountText: `${t.comment_count || 0} replies`,
      reactionText: `${Object.values(t.reaction_counts || {}).reduce((a, b) => a + b, 0)} reactions`,
      _raw: t
    }));

    vm.threads = new ObservableArray(mapped);

    if (mapped.length === 0) {
      emptyState.visibility = 'visible';
    }
  } catch (err) {
    console.error('Failed to load threads:', err);
  } finally {
    loading.busy = false;
  }
}

export function onThreadTap(args) {
  const thread = args.view.bindingContext;
  if (thread && thread.id) {
    Frame.topmost().navigate({
      moduleName: 'views/thread-detail-page',
      context: { threadId: thread.id }
    });
  }
}

export function onNewThread() {
  Frame.topmost().navigate('views/create-thread-page');
}

export function onGoToProfile() {
  Frame.topmost().navigate('views/profile-page');
}

export async function onLogout() {
  try {
    await authService.signOut();
    Frame.topmost().navigate({
      moduleName: 'views/login-page',
      clearHistory: true
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
}

export function onFilterCategory(args) {
  const btn = args.object;
  const id = btn.id;
  const category = id.replace('filter-', '');

  // Update button styles
  const page = args.object.page;
  const buttons = ['all', 'question', 'idea', 'announcement', 'general'];
  buttons.forEach(cat => {
    const filterBtn = page.getViewById(`filter-${cat}`);
    if (filterBtn) {
      filterBtn.className = cat === category ? 'category-filter-btn active' : 'category-filter-btn';
    }
  });

  currentCategory = category;
  loadThreads();
}
