#!/usr/bin/env python3
"""
Auto-answer SQLite database operations.
Handles database commands via stdin/argv.
"""

import json
import logging
import os
import sqlite3
import sys
import uuid
from datetime import datetime

# Force UTF-8 encoding for stdin/stdout
sys.stdin = open(sys.stdin.fileno(), mode='r', encoding='utf-8', closefd=False)
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', closefd=False)

# Configure logging to stderr
logging.basicConfig(
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Constants
CONFIG_DIR = os.environ.get('OPENCODE_CONFIG_DIR', os.getcwd())
DB_DIR = os.path.join(CONFIG_DIR, '.auto-answer', 'database')
DB_PATH = os.path.join(DB_DIR, 'auto-answer.db')
SCHEMA_PATH = os.path.join(CONFIG_DIR, '.auto-answer', 'sql', 'schema.sql')


def get_connection():
    """Get database connection with row factory."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize database from schema file."""
    try:
        if not os.path.exists(SCHEMA_PATH):
            logger.error(f"Schema file not found: {SCHEMA_PATH}")
            print(json.dumps({"error": f"Schema file not found: {SCHEMA_PATH}"}))
            return

        with open(SCHEMA_PATH, 'r') as f:
            schema = f.read()

        conn = get_connection()
        conn.executescript(schema)
        conn.commit()
        conn.close()

        print(json.dumps({"status": "success", "message": "Database initialized"}))
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        print(json.dumps({"error": str(e)}))


def add_questions():
    """Add questions from stdin JSON."""
    try:
        data = json.load(sys.stdin)
        if not isinstance(data, list):
            data = [data]

        conn = get_connection()
        cursor = conn.cursor()

        for item in data:
            question_id = item.get('id') or str(uuid.uuid4())
            source_id = item['source_id']
            content = item['content']
            options = json.dumps(item['options']) if isinstance(item['options'], list) else item['options']
            multiple = item.get('multiple', 0)
            created_at = item.get('created_at') or datetime.now().isoformat()

            cursor.execute('''
                           INSERT INTO questions (id, source_id, content, options, multiple, created_at)
                           VALUES (?, ?, ?, ?, ?, ?)
                           ''', (question_id, source_id, content, options, multiple, created_at))

        conn.commit()
        conn.close()

        print(json.dumps({"status": "success", "count": len(data)}))
    except Exception as e:
        logger.error(f"Failed to add questions: {e}")
        print(json.dumps({"error": str(e)}))


def get_questions():
    """Get all questions."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM questions')
        rows = cursor.fetchall()
        conn.close()

        questions = []
        for row in rows:
            item = dict(row)
            # Parse options JSON
            try:
                item['options'] = json.loads(item['options'])
            except (json.JSONDecodeError, TypeError):
                pass
            questions.append(item)

        print(json.dumps(questions))
    except Exception as e:
        logger.error(f"Failed to get questions: {e}")
        print(json.dumps({"error": str(e)}))


def get_unanswered_by_source():
    """Get unanswered questions by source_id."""
    try:
        data = json.load(sys.stdin)
        source_id = data.get('source_id')

        if not source_id:
            print(json.dumps({"error": "source_id is required"}))
            return

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute('''
                       SELECT q.*
                       FROM questions q
                                LEFT JOIN answers a ON q.id = a.question_id
                       WHERE q.source_id = ?
                         AND a.id IS NULL
                       ''', (source_id,))

        rows = cursor.fetchall()
        conn.close()

        questions = []
        for row in rows:
            item = dict(row)
            try:
                item['options'] = json.loads(item['options'])
            except (json.JSONDecodeError, TypeError):
                pass
            questions.append(item)

        print(json.dumps(questions))
    except Exception as e:
        logger.error(f"Failed to get unanswered questions: {e}")
        print(json.dumps({"error": str(e)}))


def add_answers():
    """Add answers from stdin JSON."""
    try:
        data = json.load(sys.stdin)
        if not isinstance(data, list):
            data = [data]

        conn = get_connection()
        cursor = conn.cursor()

        for item in data:
            answer_id = item.get('id') or str(uuid.uuid4())
            question_id = item['question_id']
            source_id = item['source_id']
            answer = item.get('answer', '')
            created_at = item.get('created_at') or datetime.now().isoformat()

            cursor.execute('''
                INSERT OR REPLACE INTO answers (id, question_id, source_id, answer, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (answer_id, question_id, source_id, answer, created_at))

        conn.commit()
        conn.close()

        print(json.dumps({"status": "success", "count": len(data)}))
    except Exception as e:
        logger.error(f"Failed to add answers: {e}")
        print(json.dumps({"error": str(e)}))


def get_answers():
    """Get all answers."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM answers')
        rows = cursor.fetchall()
        conn.close()

        answers = [dict(row) for row in rows]
        print(json.dumps(answers))
    except Exception as e:
        logger.error(f"Failed to get answers: {e}")
        print(json.dumps({"error": str(e)}))


def get_answer_by_question_id():
    """Check if question has answer."""
    try:
        data = json.load(sys.stdin)
        question_id = data.get('question_id')

        if not question_id:
            print(json.dumps({"error": "question_id is required"}))
            return

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM answers WHERE question_id = ?', (question_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            print(json.dumps(dict(row)))
        else:
            print(json.dumps(None))
    except Exception as e:
        logger.error(f"Failed to get answer: {e}")
        print(json.dumps({"error": str(e)}))


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Command required"}))
        sys.exit(1)

    command = sys.argv[1]

    commands = {
        'init': init_database,
        'add_questions': add_questions,
        'get_questions': get_questions,
        'get_unanswered_by_source': get_unanswered_by_source,
        'add_answers': add_answers,
        'get_answers': get_answers,
        'get_answer_by_question_id': get_answer_by_question_id,
    }

    if command not in commands:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)

    commands[command]()


if __name__ == '__main__':
    main()
