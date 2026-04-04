export interface Option {
  text: string;
  description?: string;
}

export interface Question {
  id: string;
  content: string;
  options: Option[];
  multiple: boolean;
  createdAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  selectedOptions: string[];
  customAnswer: string;
  createdAt: string;
}

export interface QuestionInput {
  content: string;
  options: Option[];
  multiple?: boolean;
}

export interface AnswerInput {
  questionId: string;
  selectedOptions?: string[];
  customAnswer?: string;
}
