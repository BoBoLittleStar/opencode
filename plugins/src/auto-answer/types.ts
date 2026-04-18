export interface Option {
    text: string;
    description?: string;
}

export interface Question {
    id: string;
    group_id: string;
    source_id: string;
    content: string;
    options: Option[];
    multiple: boolean;
    createdAt: string;
    answer?: string; // Single field for answer (selected option or custom text)
}

export interface Answer {
    id: string;
    group_id: string;
    question_id: string;
    source_id: string;
    answer: string; // Single field: selected option or custom answer text
    createdAt: string;
}

export interface QuestionInput {
    group_id: string;
    source_id: string;
    content: string;
    options: Option[];
    multiple?: boolean;
}

export interface AnswerInput {
    group_id: string;
    source_id: string;
    questionId: string;
    answer: string; // Single field for answer
}
