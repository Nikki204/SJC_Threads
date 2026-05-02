import { authService } from './auth';
import { localDb } from './local-db';
import { deleteFilesIfExist } from './media';

export async function fetchThreads() {
  const db = await localDb.load();
  const threads = [...(db.threads || [])].sort((a, b) => {
    const at = new Date(a.updated_at || a.created_at || 0).getTime();
    const bt = new Date(b.updated_at || b.created_at || 0).getTime();
    return bt - at;
  });

  return threads.map(t => {
    const profile = (db.profiles || []).find(p => p.id === t.author_id) || null;
    const comments = (db.comments || []).filter(c => c.thread_id === t.id);
    const reactions = (db.reactions || []).filter(r => r.target_type === 'thread' && r.target_id === t.id);
    return {
      ...t,
      image_urls: Array.isArray(t.image_urls) ? t.image_urls : [],
      profiles: profile ? {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      } : null,
      comments,
      reactions,
      comment_count: comments.length,
      reaction_counts: countReactions(reactions)
    };
  });
}

export async function fetchThreadById(threadId) {
  const db = await localDb.load();
  const thread = (db.threads || []).find(t => t.id === threadId) || null;
  if (!thread) return null;
  const profile = (db.profiles || []).find(p => p.id === thread.author_id) || null;
  return {
    ...thread,
    image_urls: Array.isArray(thread.image_urls) ? thread.image_urls : [],
    profiles: profile ? {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      created_at: profile.created_at
    } : null
  };
}

export async function fetchProfileByUserId(userId) {
  if (!userId) return null;
  const db = await localDb.load();
  const profile = (db.profiles || []).find(p => p.id === userId) || null;
  if (!profile) return null;
  return { ...profile };
}

export async function fetchThreadReactions(threadId) {
  const db = await localDb.load();
  return (db.reactions || [])
    .filter(r => r.target_type === 'thread' && r.target_id === threadId)
    .map(r => ({ reaction_type: r.reaction_type, user_id: r.user_id }));
}

export async function fetchComments(threadId) {
  const db = await localDb.load();
  const comments = (db.comments || [])
    .filter(c => c.thread_id === threadId)
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  return comments.map(c => {
    const profile = (db.profiles || []).find(p => p.id === c.author_id) || null;
    return {
      ...c,
      profiles: profile ? {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      } : null
    };
  });
}

export async function fetchCommentReactions(commentIds) {
  if (!commentIds || commentIds.length === 0) return [];
  const db = await localDb.load();
  const set = new Set(commentIds);
  return (db.reactions || [])
    .filter(r => r.target_type === 'comment' && set.has(r.target_id))
    .map(r => ({ reaction_type: r.reaction_type, user_id: r.user_id, target_id: r.target_id }));
}

export async function createThread(title, message, category, imageRelativePaths) {
  const user = authService.currentUser;
  if (!user) throw new Error('Not logged in');

  const images = Array.isArray(imageRelativePaths)
    ? imageRelativePaths.filter(u => typeof u === 'string' && u.length > 0)
    : [];

  const created = await localDb.transaction(async (db, { uuid, nowIso }) => {
    const ts = nowIso();
    const thread = {
      id: `thread_${uuid()}`,
      author_id: user.id,
      title,
      message,
      category: category || 'general',
      image_urls: images,
      created_at: ts,
      updated_at: ts
    };
    db.threads.push(thread);
    return thread;
  });

  const db = await localDb.load();
  const profile = (db.profiles || []).find(p => p.id === user.id) || null;
  return {
    ...created,
    profiles: profile ? {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url
    } : null
  };
}

export async function createComment(threadId, message, parentCommentId) {
  const user = authService.currentUser;
  if (!user) throw new Error('Not logged in');

  const created = await localDb.transaction(async (db, { uuid, nowIso }) => {
    const exists = (db.threads || []).some(t => t.id === threadId);
    if (!exists) throw new Error('Thread not found');

    const ts = nowIso();
    const comment = {
      id: `comment_${uuid()}`,
      thread_id: threadId,
      author_id: user.id,
      message,
      parent_comment_id: parentCommentId || null,
      created_at: ts,
      updated_at: ts
    };
    db.comments.push(comment);
    const thread = (db.threads || []).find(t => t.id === threadId);
    if (thread) thread.updated_at = ts;
    return comment;
  });

  const db = await localDb.load();
  const profile = (db.profiles || []).find(p => p.id === user.id) || null;
  return {
    ...created,
    profiles: profile ? {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url
    } : null
  };
}

export async function toggleReaction(targetId, targetType, reactionType) {
  const user = authService.currentUser;
  if (!user) throw new Error('Not logged in');

  if (targetType !== 'thread' && targetType !== 'comment') {
    throw new Error('Invalid target type');
  }

  return await localDb.transaction(async (db, { uuid, nowIso }) => {
    const existingIdx = (db.reactions || []).findIndex(r =>
      r.user_id === user.id &&
      r.target_id === targetId &&
      r.target_type === targetType &&
      r.reaction_type === reactionType
    );

    const bumpThread = tid => {
      const thread = (db.threads || []).find(t => t.id === tid);
      if (thread) thread.updated_at = ts;
    };

    const ts = nowIso();

    if (existingIdx >= 0) {
      db.reactions.splice(existingIdx, 1);
      if (targetType === 'thread') bumpThread(targetId);
      else {
        const comment = (db.comments || []).find(c => c.id === targetId);
        if (comment) bumpThread(comment.thread_id);
      }
      return { action: 'removed' };
    }

    db.reactions.push({
      id: `reaction_${uuid()}`,
      user_id: user.id,
      target_id: targetId,
      target_type: targetType,
      reaction_type: reactionType,
      created_at: ts
    });
    if (targetType === 'thread') bumpThread(targetId);
    else {
      const comment = (db.comments || []).find(c => c.id === targetId);
      if (comment) bumpThread(comment.thread_id);
    }
    return { action: 'added' };
  });
}

export async function deleteThread(threadId) {
  let pathsToDelete = [];
  await localDb.transaction(async (db) => {
    const idx = (db.threads || []).findIndex(t => t.id === threadId);
    if (idx < 0) return;
    const removed = db.threads[idx];
    if (removed && Array.isArray(removed.image_urls)) {
      pathsToDelete = removed.image_urls.slice();
    }
    db.threads.splice(idx, 1);

    const commentIds = new Set((db.comments || []).filter(c => c.thread_id === threadId).map(c => c.id));
    db.comments = (db.comments || []).filter(c => c.thread_id !== threadId);
    db.reactions = (db.reactions || []).filter(r => {
      if (r.target_type === 'thread' && r.target_id === threadId) return false;
      if (r.target_type === 'comment' && commentIds.has(r.target_id)) return false;
      return true;
    });
  });
  deleteFilesIfExist(pathsToDelete);
}

export async function deleteComment(commentId) {
  await localDb.transaction(async (db) => {
    const comments = db.comments || [];
    const toDelete = new Set();
    const stack = [commentId];
    while (stack.length) {
      const id = stack.pop();
      if (toDelete.has(id)) continue;
      toDelete.add(id);
      comments.forEach(c => {
        if (c.parent_comment_id === id) stack.push(c.id);
      });
    }

    db.comments = comments.filter(c => !toDelete.has(c.id));
    db.reactions = (db.reactions || []).filter(r => !(r.target_type === 'comment' && toDelete.has(r.target_id)));
  });
}

function countReactions(reactions) {
  const counts = {};
  for (const r of reactions) {
    counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
  }
  return counts;
}

export function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function buildCommentTree(comments) {
  const map = {};
  const roots = [];

  comments.forEach(c => {
    map[c.id] = { ...c, replies: [] };
  });

  comments.forEach(c => {
    if (c.parent_comment_id && map[c.parent_comment_id]) {
      map[c.parent_comment_id].replies.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });

  return roots;
}
