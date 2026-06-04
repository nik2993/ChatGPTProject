import dotenv from 'dotenv';
dotenv.config();

export interface EmailConfig {
  host:    string;
  port:    number;
  secure:  boolean;
  user:    string;
  pass:    string;
  from:    string;
  to:      string;
  subject: string;
}

export interface TestData {
  chatgptUrl:         string;
  playwrightQuestion: string;
  email:              EmailConfig;
  chatgptResponseTimeout: number;
}

const testData: TestData = {
  chatgptUrl: 'https://chatgpt.com',

  playwrightQuestion: 'Who is the president of India?',

  email: {
    host:    'smtp.gmail.com',
    port:    587,
    secure:  false,
    user:    process.env.EMAIL_USER ?? '',
    pass:    process.env.EMAIL_PASS ?? '',
    from:    process.env.EMAIL_FROM ?? '',
    to:      process.env.EMAIL_TO   ?? '',
    subject: 'ChatGPT Response - Playwright Automation Question',
  },

  chatgptResponseTimeout: 120_000,
};

export default testData;
