import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const SESSION_FILE = path.join(__dirname, 'auth/session.json');
const AUDIO_FILE   = path.join(__dirname, 'data/question.wav');

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  // Generates the speech audio file before any tests run
  globalSetup: './global-setup',

  use: {
    baseURL: 'https://chatgpt.com',
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',        // auto-grant mic permission
        '--use-fake-device-for-media-stream',    // use fake mic device
        `--use-file-for-fake-audio-capture=${AUDIO_FILE}`, // mic plays our WAV file
        '--allow-file-access-from-files',
        '--disable-blink-features=AutomationControlled',
      ],
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      timeout: 360_000,
      use: {
        headless: false,
        launchOptions: {
          args: [
            '--allow-file-access-from-files',
            '--disable-blink-features=AutomationControlled',
          ],
        },
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: SESSION_FILE,
      },
      dependencies: ['setup'],
    },
  ],
});
