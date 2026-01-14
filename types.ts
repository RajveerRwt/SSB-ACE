
export enum TestType {
  DASHBOARD = 'DASHBOARD',
  LOGIN = 'LOGIN',
  PIQ = 'PIQ',
  PPDT = 'PPDT',
  TAT = 'TAT',
  WAT = 'WAT',
  SRT = 'SRT',
  SDT = 'SDT',
  INTERVIEW = 'INTERVIEW',
  CONTACT = 'CONTACT',
  STAGES = 'STAGES',
  AI_BOT = 'AI_BOT',
  ADMIN = 'ADMIN',
  TERMS = 'TERMS',
  PRIVACY = 'PRIVACY',
  REFUND = 'REFUND'
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

export interface UserSubscription {
  tier: 'FREE' | 'PRO';
  expiryDate: string | null; // ISO Date string
  usage: {
    interview_used: number;
    interview_limit: number;
    ppdt_used: number;
    ppdt_limit: number;
    tat_used: number;
    tat_limit: number;
    wat_used: number; // Unlimited, but tracking for stats
    srt_used: number; // Unlimited, but tracking for stats
    sdt_used: number; // Unlimited, but tracking for stats
  };
  extra_credits: {
    interview: number;
  }
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  utr: string;
  amount: number;
  plan_type: 'PRO_SUBSCRIPTION' | 'INTERVIEW_ADDON';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}
