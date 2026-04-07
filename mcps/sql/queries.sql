-- Auto-Answer Server Query Templates
-- These are extracted from db.py for reference

-- ============================================
-- QUESTIONS
-- ============================================

-- Get all questions
-- SELECT * FROM questions;

-- Add a question
-- INSERT INTO questions (id, group_id, source_id, content, options, multiple, created_at)
-- VALUES (?, ?, ?, ?, ?, ?, ?);

-- Get the latest group_id that has unanswered questions
-- SELECT q.group_id, MAX(q.created_at) as latest
-- FROM questions q
-- LEFT JOIN answers a ON q.id = a.question_id
-- WHERE q.source_id = ? AND a.id IS NULL
-- GROUP BY q.group_id
-- ORDER BY latest DESC
-- LIMIT 1;

-- Get unanswered questions for a specific group
-- SELECT q.*
-- FROM questions q
-- LEFT JOIN answers a ON q.id = a.question_id
-- WHERE q.group_id = ? AND a.id IS NULL;

-- Delete questions without group_id
-- DELETE FROM questions WHERE group_id IS NULL OR group_id = '';

-- ============================================
-- ANSWERS
-- ============================================

-- Get all answers
-- SELECT * FROM answers;

-- Add or replace an answer
-- INSERT OR REPLACE INTO answers (id, group_id, question_id, source_id, answer, created_at)
-- VALUES (?, ?, ?, ?, ?, ?);

-- Get answer by question_id
-- SELECT * FROM answers WHERE question_id = ?;

-- Delete answers for questions without group_id
-- DELETE FROM answers WHERE question_id IN (
--     SELECT id FROM questions WHERE group_id IS NULL OR group_id = ''
-- );

-- ============================================
-- JOIN QUERIES
-- ============================================

-- Get questions with their answers (for API response)
-- SELECT q.*, a.answer
-- FROM questions q
-- LEFT JOIN answers a ON q.id = a.question_id;
