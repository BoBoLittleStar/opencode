import http from 'http';
import type { Question, Answer, QuestionInput, AnswerInput } from './types';
import { getQuestions, addQuestions, getAnswers, addAnswers } from './storage';

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// API: POST /api/questions
async function handleQuestions(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = (await parseBody(req)) as { questions: QuestionInput[] };
  
  if (!body.questions || !Array.isArray(body.questions)) {
    return sendJson(res, 400, { error: 'Missing or invalid questions array' });
  }

  for (const q of body.questions) {
    if (!q.content || !q.options || !Array.isArray(q.options)) {
      return sendJson(res, 400, { error: 'Each question must have content and options array' });
    }
    for (const opt of q.options) {
      if (!opt.text) {
        return sendJson(res, 400, { error: 'Each option must have text' });
      }
    }
  }

  const newQuestions: Question[] = body.questions.map((q, idx) => ({
    id: `q_${Date.now()}_${idx}`,
    content: q.content,
    options: q.options.map(opt => ({
      text: opt.text,
      description: opt.description || ''
    })),
    multiple: q.multiple || false,
    createdAt: new Date().toISOString()
  }));

  addQuestions(newQuestions);

  sendJson(res, 200, { 
    success: true, 
    count: newQuestions.length,
    questions: newQuestions 
  });
}

// API: POST /api/answers
async function handleAnswers(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = (await parseBody(req)) as { answers: AnswerInput[] };
  
  if (!body.answers || !Array.isArray(body.answers)) {
    return sendJson(res, 400, { error: 'Missing or invalid answers array' });
  }

  const questions = getQuestions();
  const existingAnswers = getAnswers();

  for (const a of body.answers) {
    if (!a.questionId) {
      return sendJson(res, 400, { error: 'Each answer must have questionId' });
    }
    const question = questions.find(q => q.id === a.questionId);
    if (!question) {
      return sendJson(res, 404, { error: `Question ${a.questionId} not found` });
    }
  }

  const newAnswers: Answer[] = body.answers.map((a, idx) => ({
    id: `a_${Date.now()}_${idx}`,
    questionId: a.questionId,
    selectedOptions: a.selectedOptions || [],
    customAnswer: a.customAnswer || '',
    createdAt: new Date().toISOString()
  }));

  addAnswers(newAnswers);

  sendJson(res, 200, { 
    success: true, 
    count: newAnswers.length,
    answers: newAnswers 
  });
}

function handleGetQuestions(res: http.ServerResponse): void {
  const questions = getQuestions();
  sendJson(res, 200, { questions });
}

function handleGetAnswers(res: http.ServerResponse): void {
  const answers = getAnswers();
  sendJson(res, 200, { answers });
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    const url = req.url ?? '';
    const method = req.method;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') {
      return res.end();
    }

    try {
      if (method === 'POST' && url === '/api/questions') {
        return handleQuestions(req, res);
      }
      if (method === 'POST' && url === '/api/answers') {
        return handleAnswers(req, res);
      }
      if (method === 'GET' && url === '/api/questions') {
        return handleGetQuestions(res);
      }
      if (method === 'GET' && url === '/api/answers') {
        return handleGetAnswers(res);
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      sendJson(res, 500, { error: message });
    }
  });
}
