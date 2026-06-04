import { Page, Locator } from '@playwright/test';

export class ChatGPTPage {
  readonly page: Page;

  private readonly promptTextarea:   Locator;
  private readonly micButton:        Locator;
  private readonly sendButton:       Locator;
  private readonly cookieAcceptBtn:  Locator;
  private readonly assistantMessage: Locator;
  private readonly stopButton:       Locator;

  constructor(page: Page) {
    this.page = page;

    this.promptTextarea = page.locator('div#prompt-textarea').first();

    // Mic button in the composer area
    this.micButton = page.locator([
      'button[aria-label*="microphone" i]',
      'button[aria-label*="voice" i]',
      'button[aria-label*="dictation" i]',
      'button[data-testid*="mic" i]',
    ].join(', ')).first();

    this.sendButton = page.locator([
      'button[data-testid="send-button"]',
      'button[aria-label*="send" i]',
    ].join(', ')).first();

    this.cookieAcceptBtn = page.locator(
      'button:has-text("Reject non-essential"), button:has-text("Accept all")'
    ).first();

    this.assistantMessage = page.locator('[data-message-author-role="assistant"]');
    this.stopButton       = page.locator('button[data-testid="stop-button"]');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async navigate(url: string): Promise<void> {
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  // ── Cookie banner ──────────────────────────────────────────────────────────

  async dismissCookieBanner(): Promise<void> {
    const visible = await this.cookieAcceptBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (visible) {
      await this.cookieAcceptBtn.click();
      await this.page.waitForTimeout(500);
      console.log('Cookie banner dismissed.');
    }
  }

  // ── Dismiss login/rate-limit modal ─────────────────────────────────────────

  async dismissAnyModal(): Promise<void> {
    const btn = this.page.locator(
      '#modal-no-auth-rate-limit button:has-text("Stay logged out"), button:has-text("Stay logged out")'
    ).first();
    const visible = await btn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (visible) {
      await btn.click();
      await this.page.waitForTimeout(500);
      console.log('Modal dismissed.');
    }
  }

  // ── Mic — click to start voice recording ──────────────────────────────────

  async clickMicButton(): Promise<void> {
    await this.micButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.micButton.click();
    await this.page.waitForTimeout(1_000);
    console.log('Mic button clicked — voice recording started (playing audio file).');
  }

  // ── Confirm voice recording ────────────────────────────────────────────────
  // After clicking mic, the WAV file plays through the fake microphone.
  // We wait for it to finish, then click the confirm (✓) button.
  // ChatGPT then sends the audio to OpenAI Whisper for transcription.

  async confirmVoiceRecording(audioDurationMs: number = 4_000): Promise<void> {
    // Wait for the full audio file to play through the mic
    console.log(`Waiting ${audioDurationMs / 1000}s for audio to play...`);
    await this.page.waitForTimeout(audioDurationMs);

    // Click the confirm/submit button (✓) in the voice recording UI
    const confirmSelectors = [
      'button[aria-label*="submit" i]',
      'button[aria-label*="confirm" i]',
      'button[aria-label*="done" i]',
      'button[aria-label*="send" i]',
    ];

    let confirmed = false;
    for (const sel of confirmSelectors) {
      const btn = this.page.locator(sel).last();
      const visible = await btn.isVisible({ timeout: 1_000 }).catch(() => false);
      if (visible) {
        await btn.click();
        confirmed = true;
        console.log(`Voice recording confirmed via: ${sel}`);
        break;
      }
    }

    // Fallback: press Enter (some voice UIs accept this)
    if (!confirmed) {
      await this.page.keyboard.press('Enter');
      console.log('Voice recording confirmed via Enter key.');
    }

    await this.page.waitForTimeout(1_000);
  }

  // ── Wait for Whisper transcription to appear in the input ─────────────────

  async waitForVoiceTranscription(timeout: number = 30_000): Promise<string> {
    console.log('Waiting for voice transcription from Whisper...');
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const text = await this.promptTextarea.innerText().catch(() => '');
      if (text.trim().length > 0) {
        console.log(`Transcription received: "${text.trim()}"`);
        return text.trim();
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error('Transcription timeout — no text appeared after voice recording.');
  }

  // ── Verify text in input matches expected ──────────────────────────────────

  async verifyTranscribedText(
    expectedText: string
  ): Promise<{ actual: string; matches: boolean }> {
    const actual  = await this.promptTextarea.innerText()
      .catch(() => this.promptTextarea.inputValue().catch(() => ''));
    const matches = actual.trim().toLowerCase().includes(
      expectedText.toLowerCase().slice(0, 15)
    );
    console.log(`Transcribed text  : "${actual.trim()}"`);
    console.log(`Verification      : ${matches ? 'PASSED ✓' : 'FAILED ✗'}`);
    return { actual: actual.trim(), matches };
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async clickSendButton(): Promise<void> {
    await this.sendButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.sendButton.click();
    console.log('Send (arrow) button clicked.');
  }

  // ── Wait for and capture response ──────────────────────────────────────────

  async waitForResponseToComplete(timeout: number = 120_000): Promise<void> {
    console.log('Waiting for ChatGPT to start responding...');
    const deadline = Date.now() + timeout;

    // Phase 1: wait for real text (not just loading dot)
    while (Date.now() < deadline) {
      const messages = await this.assistantMessage.all();
      if (messages.length > 0) {
        const text = await messages[messages.length - 1].innerText().catch(() => '');
        if (text.trim().length > 10) {
          console.log('Response is streaming...');
          break;
        }
      }
      await this.page.waitForTimeout(2_000);
    }

    // Phase 2: wait for text to stabilise (same for 4 seconds)
    let previous    = '';
    let stableCount = 0;
    while (Date.now() < deadline) {
      const messages = await this.assistantMessage.all();
      const current  = messages.length > 0
        ? await messages[messages.length - 1].innerText().catch(() => '')
        : '';
      if (current.length > 0 && current === previous) {
        stableCount++;
        if (stableCount >= 4) break;
      } else {
        stableCount = 0;
        previous    = current;
      }
      await this.page.waitForTimeout(1_000);
    }

    const stopVisible = await this.stopButton.isVisible().catch(() => false);
    if (stopVisible) {
      await this.stopButton.click();
      await this.page.waitForTimeout(1_500);
      console.log('Stop button clicked to end streaming.');
    }

    await this.page.waitForTimeout(1_000);
    console.log('ChatGPT response complete.');
  }

  async getChatGPTResponse(): Promise<string> {
    const messages = await this.assistantMessage.all();
    if (messages.length === 0) throw new Error('No assistant response found.');
    const text = await messages[messages.length - 1].innerText();
    console.log(`Response captured (${text.trim().length} chars).`);
    return text.trim();
  }
}
