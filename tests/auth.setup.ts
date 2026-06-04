import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SESSION_FILE = path.join(__dirname, '../auth/session.json');

function hasValidSession(): boolean {
  try {
    if (!fs.existsSync(SESSION_FILE)) return false;
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    // Valid if file exists and has any chatgpt.com cookies saved
    const chatgptCookies = data.cookies?.filter(
      (c: { domain: string }) => c.domain?.includes('chatgpt.com')
    ) ?? [];
    return chatgptCookies.length > 0;
  } catch {
    return false;
  }
}

setup('Save ChatGPT auth session', async ({ page }) => {
  if (hasValidSession()) {
    console.log('Valid authenticated session found — skipping login.');
    return;
  }

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log('\n====================================================');
  console.log('  Please LOG IN to ChatGPT in the browser window.  ');
  console.log('  Click Log in → Continue with Google → pick your  ');
  console.log('  Google account. Session saves automatically.      ');
  console.log('====================================================\n');

  await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });

  const deadline = Date.now() + 300_000; // 5 minutes

  while (Date.now() < deadline) {
    await page.waitForTimeout(3_000);

    const cookies = await page.context().cookies();

    const url = page.url();
    console.log(`Waiting for login... (${cookies.length} cookies so far)`);
    console.log(`Current URL: ${url}`);

    // Detect login: session token OR logged-in chatgpt.com with many cookies
    const hasSessionToken = cookies.some(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name.includes('session-token')
    );
    const loggedInByCount = url.startsWith('https://chatgpt.com') &&
                            !url.includes('/auth') &&
                            cookies.length > 20;

    if (hasSessionToken || loggedInByCount) {
      console.log(`\nLogin detected! (${cookies.length} cookies on ${url})`);
      break;
    }
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2_000);

  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  await page.context().storageState({ path: SESSION_FILE });
  console.log(`\nSession saved → ${SESSION_FILE}`);
  console.log('Now run:  npm test\n');
});
