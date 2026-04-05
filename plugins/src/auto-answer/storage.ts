import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import type {Option} from './types';

// Use OPENCODE_CONFIG_DIR or fallback to cwd()
const CONFIG_DIR = process.env.OPENCODE_CONFIG_DIR || process.cwd();
const DATA_DIR = path.join(CONFIG_DIR, '.auto-answer');
const DB_DIR = path.join(DATA_DIR, 'database');

// Resolve Python script path relative to this file's location
const SCRIPT_DIR = path.dirname(path.resolve(__filename));
const PYTHON_SCRIPT = path.join(SCRIPT_DIR, 'python', 'db.py');

export interface QuestionRow {
    id: string;
    source_id: string;
    content: string;
    options: string;
    multiple: number;
    created_at: string;
}

export interface AnswerRow {
    id: string;
    question_id: string;
    source_id: string;
    selected_options: string | null;
    custom_answer: string | null;
    created_at: string;
}

export interface Question {
    id: string;
    source_id: string;
    content: string;
    options: Option[];
    multiple: boolean;
    createdAt: string;
}

export interface Answer {
    id: string;
    question_id: string;
    source_id: string;
    answer: string;
    createdAt: string;
}

function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {recursive: true});
    }
}

function runPythonCommand(command: string, stdinData?: unknown): string {
    ensureDir(DB_DIR);

    // Use 'python' on Windows, 'python3' on Unix
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = [pythonCmd, PYTHON_SCRIPT, command];
    const options: { input?: string; encoding: 'utf-8' } = {encoding: 'utf-8'};

    // Suppress stderr warning on Windows by redirecting to null
    if (process.platform === 'win32') {
        args.push('2>NUL');
    }

    if (stdinData !== undefined) {
        options.input = JSON.stringify(stdinData);
    }

    try {
        return execSync(args.join(' '), options);
    } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string };
        throw new Error(err.stdout || err.stderr || String(error));
    }
}

function parseJsonOutput(output: string): unknown {
    const trimmed = output.trim();
    if (!trimmed) {
        return null;
    }
    return JSON.parse(trimmed);
}

export function initDatabase(): void {
    const output = runPythonCommand('init');
    const result = parseJsonOutput(output) as { error?: string };
    if (result.error) {
        throw new Error(result.error);
    }
}

export function addQuestions(questions: Omit<Question, 'id'>[]): void {
    const data = questions.map((q) => ({
        source_id: q.source_id,
        content: q.content,
        options: q.options,
        multiple: q.multiple ? 1 : 0,
        created_at: q.createdAt,
    }));

    const output = runPythonCommand('add_questions', data);
    const result = parseJsonOutput(output) as { error?: string };
    if (result.error) {
        throw new Error(result.error);
    }
}

function mapRowToQuestion(row: Record<string, unknown>): Question {
    return {
        id: row.id as string,
        source_id: row.source_id as string,
        content: row.content as string,
        options: row.options as Option[],
        multiple: Boolean(row.multiple),
        createdAt: row.created_at as string,
    };
}

function mapRowToAnswer(row: Record<string, unknown>): Answer {
    return {
        id: row.id as string,
        question_id: row.question_id as string,
        source_id: row.source_id as string,
        answer: (row.answer as string) || '',
        createdAt: row.created_at as string,
    };
}

export function getQuestions(): Question[] {
    const output = runPythonCommand('get_questions');
    const rows = parseJsonOutput(output) as Record<string, unknown>[];
    if (!Array.isArray(rows)) {
        return [];
    }
    return rows.map(mapRowToQuestion);
}

export function getUnansweredQuestionsBySource(sourceId: string): Question[] {
    const output = runPythonCommand('get_unanswered_by_source', {source_id: sourceId});
    const rows = parseJsonOutput(output) as Record<string, unknown>[];
    if (!Array.isArray(rows)) {
        return [];
    }
    return rows.map(mapRowToQuestion);
}

export function addAnswers(answers: Omit<Answer, 'id'>[]): void {
    const data = answers.map((a) => ({
        question_id: a.question_id,
        source_id: a.source_id,
        answer: a.answer,
        created_at: a.createdAt,
    }));

    const output = runPythonCommand('add_answers', data);
    const result = parseJsonOutput(output) as { error?: string };
    if (result.error) {
        throw new Error(result.error);
    }
}

export function getAnswers(): Answer[] {
    const output = runPythonCommand('get_answers');
    const rows = parseJsonOutput(output) as Record<string, unknown>[];
    if (!Array.isArray(rows)) {
        return [];
    }
    return rows.map(mapRowToAnswer);
}

export function getAnswerByQuestionId(questionId: string): Answer | null {
    const output = runPythonCommand('get_answer_by_question_id', {question_id: questionId});
    const row = parseJsonOutput(output) as Record<string, unknown> | null;
    if (!row) {
        return null;
    }
    return mapRowToAnswer(row);
}
