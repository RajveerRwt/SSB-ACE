
export enum TestType {
  DASHBOARD = 'DASHBOARD',
  PPDT = 'PPDT',
  TAT = 'TAT',
  WAT = 'WAT',
  SRT = 'SRT',
  INTERVIEW = 'INTERVIEW'
}

export interface Question {
  id: string;
  type: string;
  content: string;
  options?: string[];
  correctAnswer?: string;
}

export interface Feedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
}

export interface UserResponse {
  testId: string;
  responses: Record<string, string>;
  audioBlob?: Blob;
}
