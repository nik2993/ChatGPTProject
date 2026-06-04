import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },
});
