-- Auto-Answer Server Database Schema
-- SQLite 3

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    options TEXT NOT NULL,  -- JSON array
    multiple INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    answer TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_group_id ON questions(group_id);
CREATE INDEX IF NOT EXISTS idx_questions_source_id ON questions(source_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_group_id ON answers(group_id);
