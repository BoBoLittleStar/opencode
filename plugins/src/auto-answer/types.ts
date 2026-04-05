export interface Option {
  text: string;
  description?: string;
}

export interface Question {
  id: string;
  source_id: string;
  content: string;
  options: Option[];
  multiple: boolean;
  createdAt: string;
  answer?: string;  // Single field for answer (selected option or custom text)
}

export interface Answer {
  id: string;
  question_id: string;
  source_id: string;
  answer: string;  // Single field: selected option or custom answer text
  createdAt: string;
}

export interface QuestionInput {
  source_id: string;
  content: string;
  options: Option[];
  multiple?: boolean;
}

export interface AnswerInput {
  source_id: string;
  questionId: string;
  answer: string;  // Single field for answer
}
