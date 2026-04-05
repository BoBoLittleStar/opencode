import http from 'http';
import type {AnswerInput, QuestionInput} from './types';
import {addAnswers, addQuestions, getAnswerByQuestionId, getQuestions, getUnansweredQuestionsBySource} from './storage';
import {isValidUUID, validateCustomAnswerLength, validateOptions} from './validation';

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
    res.writeHead(statusCode, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
}

// API: POST /api/questions
async function handleQuestions(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
        const body = (await parseBody(req)) as { questions: QuestionInput[] };

        if (!body.questions || !Array.isArray(body.questions)) {
            return sendJson(res, 400, {error: 'Missing or invalid questions array'});
        }

        for (const q of body.questions) {
            // Validate source_id (must be valid UUID)
            if (!q.source_id || !isValidUUID(q.source_id)) {
                return sendJson(res, 400, {error: 'Each question must have a valid source_id (UUID)'});
            }
            // Validate content
            if (!q.content || typeof q.content !== 'string') {
                return sendJson(res, 400, {error: 'Each question must have content (string)'});
            }
            // Validate options format strictly
            if (!validateOptions(q.options)) {
                return sendJson(res, 400, {error: 'Each option must have text field (string)'});
            }
        }

        const newQuestions = body.questions.map((q) => ({
            source_id: q.source_id,
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
    } catch (err) {
        const message = err instanceof Error ? err.message : `Unknown error: ${err}`;
        sendJson(res, 500, {error: message});
    }
}

// API: POST /api/answers
async function handleAnswers(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
        const body = (await parseBody(req)) as { answers: AnswerInput[] };

        if (!body.answers || !Array.isArray(body.answers)) {
            return sendJson(res, 400, {error: 'Missing or invalid answers array'});
        }

        // Collect all source_ids to check for batch validation
        const sourceIds = new Set<string>();
        for (const a of body.answers) {
            // Validate source_id
            if (!a.source_id || !isValidUUID(a.source_id)) {
                return sendJson(res, 400, {error: 'Each answer must have a valid source_id (UUID)'});
            }
            sourceIds.add(a.source_id);
        }

        // Batch validation: for each source, check if ALL unanswered questions are being answered
        for (const sourceId of sourceIds) {
            const unanswered = getUnansweredQuestionsBySource(sourceId);
            const answeringIds = body.answers.filter(a => a.source_id === sourceId).map(a => a.questionId);

            // Check if all unanswered questions are being answered
            const allAnswered = unanswered.every(q => answeringIds.includes(q.id));
            if (!allAnswered && unanswered.length > 0) {
                return sendJson(res, 400, {
                    error: `Must answer all unanswered questions for source ${sourceId} at once. Unanswered: ${unanswered.length}, Answering: ${answeringIds.length}`
                });
            }
        }

        // Validate each answer
        for (const a of body.answers) {
            if (!a.questionId) {
                return sendJson(res, 400, {error: 'Each answer must have questionId'});
            }

            // Check if question exists
            const questions = getQuestions();
            const question = questions.find(q => q.id === a.questionId);
            if (!question) {
                return sendJson(res, 404, {error: `Question ${a.questionId} not found`});
            }

            // Check if answer already exists for this question
            const existingAnswer = getAnswerByQuestionId(a.questionId);
            if (existingAnswer) {
                return sendJson(res, 400, {error: `Answer already exists for question ${a.questionId}`});
            }

            // Validate answer length (100 char limit)
            if (a.answer && !validateCustomAnswerLength(a.answer)) {
                return sendJson(res, 400, {error: 'Answer must be 100 characters or less'});
            }
        }

        const newAnswers = body.answers.map((a) => ({
            question_id: a.questionId,
            source_id: a.source_id,
            answer: a.answer || '',
            createdAt: new Date().toISOString()
        }));

        addAnswers(newAnswers);

        sendJson(res, 200, {
            success: true,
            count: newAnswers.length,
            answers: newAnswers
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : `Unknown error: ${err}`;
        sendJson(res, 500, {error: message});
    }
}

function handleGetQuestions(res: http.ServerResponse, url: string): void {
    try {
        // Parse query param: include_answered=true to include answered questions
        const urlObj = new URL(url, 'http://localhost');
        const includeAnswered = urlObj.searchParams.get('include_answered') === 'true';

        let questions = getQuestions();

        // Filter out answered questions by default
        if (!includeAnswered) {
            questions = questions.filter(q => !getAnswerByQuestionId(q.id));
        }

        // Attach answer to each question if it exists
        const questionsWithAnswers = questions.map(q => {
            const answer = getAnswerByQuestionId(q.id);
            return {
                ...q,
                ...(answer && {answer: answer.answer})
            };
        });
        sendJson(res, 200, {questions: questionsWithAnswers});
    } catch (err) {
        const message = err instanceof Error ? err.message : `Unknown error: ${err}`;
        sendJson(res, 500, {error: message});
    }
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
            if (method === 'GET' && url?.startsWith('/api/questions')) {
                return handleGetQuestions(res, url);
            }

            sendJson(res, 404, {error: 'Not found'});
        } catch (err) {
            const message = err instanceof Error ? err.message : `Unknown error: ${err}`;
            sendJson(res, 500, {error: message});
        }
    });
}
