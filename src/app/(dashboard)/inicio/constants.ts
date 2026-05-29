export const FEED_POSTS_SQL = `CREATE TABLE IF NOT EXISTS feed_posts (
  id                uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           text         NOT NULL,
  business_id       uuid,
  author_name       text,
  author_avatar_url text,
  content           text         NOT NULL DEFAULT '',
  image_url         text,
  likes_count       integer      DEFAULT 0 NOT NULL,
  comments_count    integer      DEFAULT 0 NOT NULL,
  views_count       integer      DEFAULT 0 NOT NULL,
  created_at        timestamptz  DEFAULT now() NOT NULL,
  updated_at        timestamptz  DEFAULT now() NOT NULL
);`;

export const REPLIES_SQL = `CREATE TABLE IF NOT EXISTS feed_comment_replies (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id        uuid        NOT NULL REFERENCES feed_post_comments(id) ON DELETE CASCADE,
  post_id           uuid        NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id           text        NOT NULL,
  author_name       text,
  author_avatar_url text,
  content           text        NOT NULL,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);`;

export const LIKES_COMMENTS_SQL = `CREATE TABLE IF NOT EXISTS feed_post_likes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid        NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id    text        NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_post_comments (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id           uuid        NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id           text        NOT NULL,
  author_name       text,
  author_avatar_url text,
  content           text        NOT NULL,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);`;
