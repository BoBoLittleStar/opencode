import type {Plugin} from "@opencode-ai/plugin";
import {postQuestions} from './client';
import { getLogger } from '#libs/logger';

function sessionIDToUUID(sessionID: string): string {
    let hash = 0;
    for (let i = 0; i < sessionID.length; i++) {
        hash = ((hash << 5) - hash) + sessionID.charCodeAt(i);
        hash = hash & hash;
    }
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0').repeat(4).slice(0, 32);
    return `${hashHex.slice(0, 8)}-${hashHex.slice(8, 12)}-${hashHex.slice(12, 16)}-${hashHex.slice(16, 20)}-${hashHex.slice(20, 32)}`;
}

export const AutoAnswer: Plugin = async () => {
    getLogger().info('[AutoAnswer] Plugin loaded!');

    return {
        'tool.execute.before': async (input, output: { args: unknown }) => {
            getLogger().info(`[AutoAnswer] tool.execute.before: tool="${input.tool}"`);
            
            if (input.tool === 'question' || input.tool === 'ask_user_question' || input.tool === 'askuserquestion') {
                const args = output.args as {
                    questions?: Array<{
                        header: string;
                        question: string;
                        options: Array<{ label: string; description?: string }>;
                        multiple?: boolean
                    }>
                };
                if (args.questions && Array.isArray(args.questions)) {
                    const source_id = input.sessionID ? sessionIDToUUID(input.sessionID) : crypto.randomUUID();
                    // Generate a group_id for this batch of questions
                    const group_id = crypto.randomUUID();
                    const questions = args.questions.map(q => ({
                        group_id,
                        source_id,
                        content: q.question,
                        options: q.options.map(opt => ({
                            text: opt.label,
                            description: opt.description || ''
                        })),
                        multiple: q.multiple || false,
                        createdAt: new Date().toISOString()
                    }));
                    let messageSent = false;
                    try {
                        await postQuestions(questions);
                        messageSent = true;
                        getLogger().info('[AutoAnswer] Questions posted successfully!');
                    } catch (err) {
                        getLogger().error(`[AutoAnswer] Failed to post questions: ${(err as Error).message}`);
                    }
                    if (messageSent) {
                        throw new Error('问题已留言，请稍后，用户将尽快回答');
                    }
                }
            }
        }
    };
};
