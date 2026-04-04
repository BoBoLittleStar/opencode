import fs from 'fs';
import path from 'path';
import type { Question, Answer } from './types';

// 使用当前工作目录
const CWD = process.cwd();
const DATA_DIR = path.join(CWD, '.auto-answer');

const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const ANSWERS_FILE = path.join(DATA_DIR, 'answers.json');

// 确保数据目录和文件存在
function ensureFile(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
}

ensureFile(QUESTIONS_FILE);
ensureFile(ANSWERS_FILE);

export function getQuestions(): Question[] {
    try {
        return JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

export function saveQuestions(questions: Question[]): void {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
}

export function getAnswers(): Answer[] {
    try {
        return JSON.parse(fs.readFileSync(ANSWERS_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

export function saveAnswers(answers: Answer[]): void {
    fs.writeFileSync(ANSWERS_FILE, JSON.stringify(answers, null, 2));
}

export function addQuestions(newQuestions: Question[]): void {
    const existing = getQuestions();
    saveQuestions([...existing, ...newQuestions]);
}

export function addAnswers(newAnswers: Answer[]): void {
    const existing = getAnswers();
    saveAnswers([...existing, ...newAnswers]);
}
