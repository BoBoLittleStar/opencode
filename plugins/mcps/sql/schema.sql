-- Auto-Answer Server Database Schema
-- SQLite 3

-- Questions table (merged with answers)
-- answer field: NULL means unanswered, non-NULL means answered
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    options TEXT NOT NULL,  -- JSON array
    multiple INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    answer TEXT DEFAULT NULL,  -- NULL = unanswered, value = the answer
    answered_at TEXT DEFAULT NULL  -- Timestamp when answered
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_group_id ON questions(group_id);
CREATE INDEX IF NOT EXISTS idx_questions_source_id ON questions(source_id);
CREATE INDEX IF NOT EXISTS idx_questions_answered ON questions(answer) WHERE answer IS NOT NULL;
