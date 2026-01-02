
export enum TestType {
  DASHBOARD = 'DASHBOARD',
  LOGIN = 'LOGIN',
  PIQ = 'PIQ',
  PPDT = 'PPDT',
  TAT = 'TAT',
  WAT = 'WAT',
  SRT = 'SRT',
  INTERVIEW = 'INTERVIEW',
  CONTACT = 'CONTACT',
  STAGES = 'STAGES',
  AI_BOT = 'AI_BOT'
}

export interface PIQData {
  selectionBoard: string;
  batchNo: string;
  chestNo: string;
  rollNo: string;
  name: string;
  fatherName: string;
  residence: {
    max: string;
    present: string;
    permanent: string;
  };
  details: {
    religion: string;
    category: string;
    motherTongue: string;
    dob: string;
    maritalStatus: string;
  };
  family: Array<{ relation: string; education: string; occupation: string; income: string }>;
  education: Array<{ qualification: string; institution: string; board: string; year: string; marks: string; medium: string; status: string; achievement: string }>;
  activities: {
    ncc: string;
    games: string;
    hobbies: string;
    extraCurricular: string;
    responsibilities: string;
  };
  previousAttempts: Array<{ entry: string; ssb: string; date: string; result: string }>;
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
