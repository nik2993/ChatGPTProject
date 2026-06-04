import { test, expect } from '@playwright/test';
import { ChatGPTPage } from '../page/ChatGPTPage';
import { EmailHelper }  from '../utils/emailHelper';
import testData         from '../data/testData';

test.describe('ChatGPT Mic Automation', () => {

  test('Ask a question via real audio mic and email the response', async ({ page }) => {
    const chatGPTPage = new ChatGPTPage(page);

    // Step 1: Open ChatGPT (storageState injects saved session — logged in)
    await chatGPTPage.navigate(testData.chatgptUrl);

    // Step 2: Dismiss cookie banner if present
    await chatGPTPage.dismissCookieBanner();

    // Step 3: Click the mic button
    // The browser's fake microphone immediately plays question.wav
    // ChatGPT records this audio and will send it to OpenAI Whisper
    await chatGPTPage.clickMicButton();

    // Step 4: Dismiss any login/rate-limit popup if it appears
    await chatGPTPage.dismissAnyModal();

    // Step 5: Wait for audio to finish playing, then confirm the recording
    // This clicks the ✓ button to submit the recorded audio to Whisper
    await chatGPTPage.confirmVoiceRecording(3_000);

    // Step 6: Wait for Whisper to return the transcription
    // The transcribed text will appear in the input box automatically
    await chatGPTPage.waitForVoiceTranscription(30_000);

    // Step 7: Verify the transcribed text matches our question
    const { actual, matches } = await chatGPTPage.verifyTranscribedText(
      testData.playwrightQuestion
    );
    expect(matches, `Transcription mismatch. Got: "${actual}"`).toBeTruthy();

    // Step 8: Click the send (arrow) button to submit
    await chatGPTPage.clickSendButton();

    // Step 9: Wait for ChatGPT to finish generating its response
    await chatGPTPage.waitForResponseToComplete(testData.chatgptResponseTimeout);

    // Step 10: Capture the response text
    const response = await chatGPTPage.getChatGPTResponse();
    expect(response.length, 'ChatGPT returned empty response').toBeGreaterThan(0);
    console.log(`\nChatGPT Response:\n${response}`);

    // Step 11: Send the response via email
    const emailHelper = new EmailHelper(testData.email);
    await emailHelper.verifyConnection();
    await emailHelper.sendEmail(testData.email.subject, response, testData.playwrightQuestion);

    console.log('Test complete — email sent with ChatGPT response.');
  });

});
