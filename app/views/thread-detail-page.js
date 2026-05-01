import { Frame, StackLayout, Label, GridLayout, Button, ActivityIndicator } from '@nativescript/core';
import { authService } from '../utils/auth';
import {
  fetchThreadById, fetchComments, fetchThreadReactions,
  fetchCommentReactions, createComment, toggleReaction,
  formatTimeAgo, buildCommentTree
} from '../utils/data';

let pageRef = null;
let threadId = null;
let threadData = null;
let allComments = [];
let allReactions = { thread: [], comments: [] };

export function onNavigatingTo(args) {
  const page = args.object;
  pageRef = page;
  threadId = page.navigationContext?.threadId;
  loadThread();
}

async function loadThread() {
  const loading = pageRef.getViewById('loading');
  loading.busy = true;

  try {
    threadData = await fetchThreadById(threadId);
    const reactions = await fetchThreadReactions(threadId);
    allReactions.thread = reactions || [];
    renderThread();

    allComments = await fetchComments(threadId);
    const commentIds = allComments.map(c => c.id);
    if (commentIds.length > 0) {
      allReactions.comments = await fetchCommentReactions(commentIds);
    }
    renderComments();
  } catch (err) {
    console.error('Failed to load thread:', err);
  } finally {
    loading.busy = false;
  }
}

function renderThread() {
  if (!threadData) return;

  const title = pageRef.getViewById('threadTitle');
  const message = pageRef.getViewById('threadMessage');
  const author = pageRef.getViewById('threadAuthor');
  const time = pageRef.getViewById('threadTime');
  const badge = pageRef.getViewById('categoryBadge');

  title.text = threadData.title;
  message.text = threadData.message;
  author.text = threadData.profiles?.display_name || threadData.profiles?.username || 'Unknown';
  time.text = formatTimeAgo(threadData.created_at);
  badge.text = threadData.category;

  const catClass = `category-badge category-${threadData.category}`;
  badge.className = catClass;

  updateReactionButtons();
}

function updateReactionButtons() {
  const userId = authService.currentUser?.id;
  const reactionTypes = ['like', 'love', 'idea', 'clap'];
  const emojis = { like: '👍', love: '❤️', idea: '💡', clap: '👏' };

  reactionTypes.forEach(type => {
    const btn = pageRef.getViewById(`react-${type}`);
    if (!btn) return;
    const count = allReactions.thread.filter(r => r.reaction_type === type).length;
    const isActive = userId && allReactions.thread.some(r => r.reaction_type === type && r.user_id === userId);
    btn.text = count > 0 ? `${emojis[type]} ${count}` : emojis[type];
    btn.className = isActive ? 'reaction-btn reaction-btn-active' : 'reaction-btn';
  });
}

function renderComments() {
  const container = pageRef.getViewById('commentsContainer');
  const noComments = pageRef.getViewById('noComments');
  container.removeChildren();

  if (allComments.length === 0) {
    noComments.visibility = 'visible';
    return;
  }
  noComments.visibility = 'collapsed';

  const tree = buildCommentTree(allComments);
  tree.forEach(comment => {
    const el = createCommentElement(comment, false);
    container.addChild(el);
  });
}

function createCommentElement(comment, isReply) {
  const wrapper = new StackLayout();
  wrapper.className = isReply ? 'comment-item comment-reply' : 'comment-item';

  const header = new GridLayout();
  header.columns = 'auto, *, auto';
  header.rows = 'auto';
  header.marginBottom = '4';

  const authorLabel = new Label();
  authorLabel.text = comment.profiles?.display_name || comment.profiles?.username || 'Unknown';
  authorLabel.className = 'comment-author';
  authorLabel.col = '0';

  const timeLabel = new Label();
  timeLabel.text = formatTimeAgo(comment.created_at);
  timeLabel.className = 'comment-time';
  timeLabel.col = '1';

  header.addChild(authorLabel);
  header.addChild(timeLabel);

  const textLabel = new Label();
  textLabel.text = comment.message;
  textLabel.className = 'comment-text';
  textLabel.textWrap = true;

  const reactionRow = new StackLayout();
  reactionRow.orientation = 'horizontal';
  reactionRow.marginTop = '6';

  const userId = authService.currentUser?.id;
  const commentReactions = allReactions.comments.filter(r => r.target_id === comment.id);
  const reactionTypes = ['like', 'love', 'idea', 'clap'];
  const emojis = { like: '👍', love: '❤️', idea: '💡', clap: '👏' };

  reactionTypes.forEach(type => {
    const count = commentReactions.filter(r => r.reaction_type === type).length;
    const isActive = userId && commentReactions.some(r => r.reaction_type === type && r.user_id === userId);
    const btn = new Button();
    btn.text = count > 0 ? `${emojis[type]} ${count}` : emojis[type];
    btn.className = isActive ? 'reaction-btn reaction-btn-active' : 'reaction-btn';
    btn.style.fontSize = '11';
    btn.style.padding = '2 8';
    btn.style.marginRight = '4';
    btn.on('tap', () => onCommentReact(comment.id, type));
    reactionRow.addChild(btn);
  });

  const replyBtn = new Button();
  replyBtn.text = 'Reply';
  replyBtn.className = 'reaction-btn';
  replyBtn.style.fontSize = '11';
  replyBtn.style.padding = '2 8';
  replyBtn.on('tap', () => {
    const replyInput = pageRef.getViewById('replyInput');
    replyInput.hint = `Reply to ${comment.profiles?.display_name || 'Unknown'}...`;
    replyInput._replyToCommentId = comment.id;
    replyInput.focus();
  });
  reactionRow.addChild(replyBtn);

  wrapper.addChild(header);
  wrapper.addChild(textLabel);
  wrapper.addChild(reactionRow);

  if (comment.replies && comment.replies.length > 0) {
    comment.replies.forEach(reply => {
      const replyEl = createCommentElement(reply, true);
      wrapper.addChild(replyEl);
    });
  }

  return wrapper;
}

export async function onReact(args) {
  const btn = args.object;
  const type = btn.id.replace('react-', '');
  try {
    await toggleReaction(threadId, 'thread', type);
    allReactions.thread = await fetchThreadReactions(threadId);
    updateReactionButtons();
  } catch (err) {
    console.error('Reaction error:', err);
  }
}

async function onCommentReact(commentId, type) {
  try {
    await toggleReaction(commentId, 'comment', type);
    const commentIds = allComments.map(c => c.id);
    allReactions.comments = await fetchCommentReactions(commentIds);
    renderComments();
  } catch (err) {
    console.error('Comment reaction error:', err);
  }
}

export async function onReply() {
  const replyInput = pageRef.getViewById('replyInput');
  const message = replyInput.text.trim();
  if (!message) return;

  const parentCommentId = replyInput._replyToCommentId || null;

  try {
    const newComment = await createComment(threadId, message, parentCommentId);
    allComments.push(newComment);
    replyInput.text = '';
    replyInput.hint = 'Write a comment...';
    replyInput._replyToCommentId = null;

    const commentIds = allComments.map(c => c.id);
    allReactions.comments = await fetchCommentReactions(commentIds);
    renderComments();
  } catch (err) {
    console.error('Reply error:', err);
  }
}

export function onBack() {
  Frame.topmost().goBack();
}
