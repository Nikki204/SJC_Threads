import { supabase } from './supabase';
import { authService } from './auth';

export async function fetchThreads() {
  const { data, error } = await supabase
    .from('threads')
    .select(`
      *,
      profiles:author_id (username, display_name, avatar_url),
      comments (id),
      reactions (reaction_type)
    `)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  return data.map(thread => ({
    ...thread,
    comment_count: thread.comments ? thread.comments.length : 0,
    reaction_counts: countReactions(thread.reactions || [])
  }));
}

export async function fetchThreadById(threadId) {
  const { data, error } = await supabase
    .from('threads')
    .select(`
      *,
      profiles:author_id (id, username, display_name, avatar_url)
    `)
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchThreadReactions(threadId) {
  const { data, error } = await supabase
    .from('reactions')
    .select('reaction_type, user_id')
    .eq('target_id', threadId)
    .eq('target_type', 'thread');
  if (error) throw error;
  return data;
}

export async function fetchComments(threadId) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:author_id (id, username, display_name, avatar_url)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchCommentReactions(commentIds) {
  if (!commentIds || commentIds.length === 0) return [];
  const { data, error } = await supabase
    .from('reactions')
    .select('reaction_type, user_id, target_id')
    .in('target_id', commentIds)
    .eq('target_type', 'comment');
  if (error) throw error;
  return data;
}

export async function createThread(title, message, category) {
  const user = authService.currentUser;
  if (!user) throw new Error('Not logged in');

  const { data, error } = await supabase
    .from('threads')
    .insert({
      author_id: user.id,
      title,
      message,
      category: category || 'general'
    })
    .select(`
      *,
      profiles:author_id (username, display_name, avatar_url)
    `)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createComment(threadId, message, parentCommentId) {
  const user = authService.currentUser;
  if (!user) throw new Error('Not logged in');

  const insertData = {
    thread_id: threadId,
    author_id: user.id,
    message
  };
  if (parentCommentId) {
    insertData.parent_comment_id = parentCommentId;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert(insertData)
    .select(`
      *,
      profiles:author_id (id, username, display_name, avatar_url)
    `)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function toggleReaction(targetId, targetType, reactionType) {
  const user = authService.currentUser;
  if (!user) throw new Error('Not logged in');

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .eq('reaction_type', reactionType)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return { action: 'removed' };
  } else {
    const { error } = await supabase
      .from('reactions')
      .insert({
        user_id: user.id,
        target_id: targetId,
        target_type: targetType,
        reaction_type: reactionType
      });
    if (error) throw error;
    return { action: 'added' };
  }
}

export async function deleteThread(threadId) {
  const { error } = await supabase
    .from('threads')
    .delete()
    .eq('id', threadId);
  if (error) throw error;
}

export async function deleteComment(commentId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
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
