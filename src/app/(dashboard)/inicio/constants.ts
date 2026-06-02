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

export const BUSINESS_INDEX_SQL = `CREATE INDEX IF NOT EXISTS feed_posts_business_id_idx
ON feed_posts(business_id);`;

export const USER_FOLLOWS_SQL = `CREATE TABLE IF NOT EXISTS user_follows (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_user_id   text        NOT NULL,
  following_user_id  text        NOT NULL,
  created_at         timestamptz DEFAULT now() NOT NULL,
  UNIQUE(follower_user_id, following_user_id),
  CHECK (follower_user_id <> following_user_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows(following_user_id);
CREATE INDEX IF NOT EXISTS user_follows_follower_idx  ON user_follows(follower_user_id);`;

export const NOTIFICATIONS_SQL = `CREATE TABLE IF NOT EXISTS notifications (
  id                uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id text         NOT NULL,
  actor_user_id     text         NOT NULL,
  actor_name        text,
  actor_avatar_url  text,
  type              text         NOT NULL,
  post_id           uuid,
  comment_id        uuid,
  reply_id          uuid,
  read_at           timestamptz,
  created_at        timestamptz  DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications(recipient_user_id, read_at)
  WHERE read_at IS NULL;`;

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
