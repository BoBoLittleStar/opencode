import { getLatestUnansweredGroup, getQuestions, getUnansweredQuestionsByGroup } from "./storage";
import type { Option } from "./types";

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if string is valid UUID format
 */
export function isValidUUID(str: string): boolean {
    return UUID_REGEX.test(str);
}

/**
 * Validate source ID - must be valid UUID
 */
export function isValidSourceId(sourceId: string): boolean {
    return isValidUUID(sourceId);
}

/**
 * Check if custom answer is within 100 character limit
 */
export function validateCustomAnswerLength(customAnswer: string): boolean {
    return customAnswer.length <= 100;
}

/**
 * Validate options array format
 * Each option must have a 'text' field (string)
 */
export function validateOptions(options: unknown): options is Option[] {
    if (!Array.isArray(options)) {
        return false;
    }
    return options.every(
        opt => opt !== null && typeof opt === "object" && "text" in opt && typeof (opt as Option).text === "string",
    );
}

/**
 * Check which question IDs exist in database
 * @returns Object with valid and invalid question ID arrays
 */
export function validateQuestionsExist(questionIds: string[]): {
    valid: string[];
    invalid: string[];
} {
    const questions = getQuestions();
    const questionSet = new Set(questions.map(q => q.id));

    return questionIds.reduce(
        (acc, id) => {
            if (questionSet.has(id)) {
                acc.valid.push(id);
            } else {
                acc.invalid.push(id);
            }
            return acc;
        },
        { valid: [] as string[], invalid: [] as string[] },
    );
}

/**
 * Check if source ID has any unanswered questions in the latest group
 */
export function validateSourceIdExists(sourceId: string): boolean {
    const groupId = getLatestUnansweredGroup(sourceId);
    if (!groupId) {
        return false;
    }
    const questions = getUnansweredQuestionsByGroup(groupId);
    return questions.length > 0;
}
