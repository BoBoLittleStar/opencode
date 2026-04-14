import type {Plugin} from "@opencode-ai/plugin";

export const QuestionDemo: Plugin = async () => {
    return {
        'tool.execute.before': async (input, output: { args: unknown }) => {
            // Test with bash tool first to verify hook works
            if (input.tool === 'question' || input.tool === 'ask_user_question' || input.tool === 'askuserquestion') {
                throw new Error('[QuestionDemo] 拦截 question 工具成功！');
            }
        }
    };
};
