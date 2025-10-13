-- 目标数据库：PostgreSQL 15+
-- 需启用扩展：uuid-ossp 或 pgcrypto（用于生成 UUID）

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    external_id     TEXT UNIQUE,
    display_name    TEXT NOT NULL,
    email           CITEXT UNIQUE,
    avatar_url      TEXT,
    locale          TEXT DEFAULT 'zh-CN',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);

-- 模型目录（可选：存储上下文长度、供应商等）
CREATE TABLE IF NOT EXISTS models (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        TEXT NOT NULL,
    model_name      TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    context_length  INTEGER,
    max_output_tokens INTEGER,
    pricing_payload JSONB,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, model_name)
);

-- 会话
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id        BIGINT NOT NULL REFERENCES users (id),
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'active', -- active / archived / trashed
    visibility      TEXT NOT NULL DEFAULT 'private', -- private / shared / public
    last_message_id UUID, -- 稍后补充外键
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at     TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations (owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations (status);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON conversations (deleted_at);

-- 会话成员
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    participant_role TEXT NOT NULL DEFAULT 'member', -- owner / editor / viewer
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    extra           JSONB,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user_role
    ON conversation_participants (user_id, participant_role);

-- 消息
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_id       BIGINT REFERENCES users (id),
    model_id        UUID REFERENCES models (id),
    parent_message_id UUID REFERENCES messages (id), -- 便于回复/分支
    role            TEXT NOT NULL, -- system / user / assistant / tool
    content         TEXT,
    rich_content    JSONB, -- 可存储富文本块、structured data
    metadata        JSONB,
    token_input     INTEGER,
    token_output    INTEGER,
    duration_ms     INTEGER,
    error_code      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender
    ON messages (sender_id);

-- 让 conversations.last_message_id 现在引用 messages
ALTER TABLE conversations
    ADD CONSTRAINT fk_conversations_last_message
    FOREIGN KEY (last_message_id) REFERENCES messages (id);

-- 流式分片
CREATE TABLE IF NOT EXISTS message_chunks (
    id              BIGSERIAL PRIMARY KEY,
    message_id      UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_chunks_unique
    ON message_chunks (message_id, chunk_index);

-- 消息反馈（点赞、评分、举报等）
CREATE TABLE IF NOT EXISTS message_feedbacks (
    id              BIGSERIAL PRIMARY KEY,
    message_id      UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    feedback_type   TEXT NOT NULL, -- like / dislike / report / rating
    score           SMALLINT,
    comment         TEXT,
    extra           JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, user_id, feedback_type)
);

CREATE INDEX IF NOT EXISTS idx_feedback_message
    ON message_feedbacks (message_id);

-- 附件主体（指向对象存储）
CREATE TABLE IF NOT EXISTS attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id        BIGINT REFERENCES users (id),
    storage_key     TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    mime_type       TEXT,
    file_size       BIGINT,
    checksum        TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attachments_storage_key
    ON attachments (storage_key);

-- 消息与附件关联（支持多个附件、多种用途）
CREATE TABLE IF NOT EXISTS message_attachments (
    message_id      UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    attachment_id   UUID NOT NULL REFERENCES attachments (id) ON DELETE CASCADE,
    kind            TEXT NOT NULL DEFAULT 'reference', -- reference / generated / tool_output
    ordering        INTEGER,
    metadata        JSONB,
    PRIMARY KEY (message_id, attachment_id)
);

-- 审计表可根据需要扩展，例如 message_events / token_usage_logs

-- 触发器示例：自动更新更新时间戳
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversations_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_messages_updated
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
