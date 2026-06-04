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

  // Generates question.wav before any test runs
  globalSetup: './global-setup',

  use: {
    baseURL: 'https://chatgpt.com',
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // ── Run once manually: npm run auth ───────────────────────────────────────
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      timeout: 360_000,
      use: {
        headless: false,
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--allow-file-access-from-files',
          ],
        },
      },
    },

    // ── Main tests ────────────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: SESSION_FILE,
        permissions: ['microphone'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',       // auto-grant mic permission
            '--use-fake-device-for-media-stream',   // use fake mic hardware
            `--use-file-for-fake-audio-capture=${AUDIO_FILE}`, // mic plays WAV file
            '--disable-blink-features=AutomationControlled',
            '--allow-file-access-from-files',
          ],
        },
      },
      dependencies: ['setup'],
    },
  ],
});
