/*
  # SJC Discussion App - Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `display_name` (text)
      - `avatar_url` (text, nullable)
      - `bio` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `threads`
      - `id` (uuid, primary key)
      - `author_id` (uuid, references profiles)
      - `title` (text)
      - `message` (text)
      - `category` (text, default 'general')
      - `attachment_url` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `comments`
      - `id` (uuid, primary key)
      - `thread_id` (uuid, references threads)
      - `author_id` (uuid, references profiles)
      - `parent_comment_id` (uuid, nullable, references comments - for threaded replies)
      - `message` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `reactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `target_id` (uuid)
      - `target_type` (text - 'thread' or 'comment')
      - `reaction_type` (text - 'like', 'love', 'idea', 'clap')
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, target_id, target_type)

  2. Security
    - Enable RLS on all tables
    - Profiles: users can read all, update own
    - Threads: authenticated users can read all, create own, update own, delete own
    - Comments: authenticated users can read all, create own, update own, delete own
    - Reactions: authenticated users can read all, create/delete own

  3. Indexes
    - Index on threads.updated_at for latest activity ordering
    - Index on comments.thread_id for thread detail queries
    - Index on reactions.target_id and target_type for reaction lookups
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Threads table
CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view threads"
  ON threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own threads"
  ON threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own threads"
  ON threads FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('thread', 'comment')),
  reaction_type text NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'idea', 'clap')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, target_id, target_type, reaction_type)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reactions"
  ON reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reactions"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update thread updated_at when a comment is added
CREATE OR REPLACE FUNCTION update_thread_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION update_thread_on_comment();
