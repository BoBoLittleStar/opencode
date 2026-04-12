import type {Plugin} from "@opencode-ai/plugin";
import { getLogger } from '#libs/logger';

export const QuestionDemo: Plugin = async () => {
    getLogger().info('[QuestionDemo] Plugin loaded!');

    return {
        'tool.execute.before': async (input, output: { args: unknown }) => {
            getLogger().info(`[QuestionDemo] Hook triggered! tool="${input.tool}"`);

            // Test with bash tool first to verify hook works
            if (input.tool === 'bash') {
                getLogger().info(`[QuestionDemo] bash tool detected!`);
            }

            if (input.tool === 'question' || input.tool === 'ask_user_question' || input.tool === 'askuserquestion') {
                getLogger().info(`[QuestionDemo] Question tool detected!`);
                throw new Error('[QuestionDemo] 拦截 question 工具成功！');
            }
        }
    };
};
