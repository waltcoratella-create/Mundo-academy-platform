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
