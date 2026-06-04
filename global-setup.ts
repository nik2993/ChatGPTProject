import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export default function globalSetup() {
  const audioDir = path.join(__dirname, 'data');
  const aiffFile = path.join(audioDir, 'question.aiff');
  const wavFile  = path.join(audioDir, 'question.wav');

  // Read question from testData
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const testData = require('./data/testData').default;

  fs.mkdirSync(audioDir, { recursive: true });

  console.log(`\nGenerating audio for: "${testData.playwrightQuestion}"`);

  // Step 1: Use Mac's built-in text-to-speech to generate AIFF audio file
  // [[slnc 8000]] adds 8 seconds of silence AFTER the speech.
  // This makes the file ~10s long so Chrome doesn't loop it during our 4s window.
  execSync(`say "${testData.playwrightQuestion} [[slnc 8000]]" -o "${aiffFile}"`);

  // Step 2: Convert AIFF to WAV (16-bit PCM, 16kHz, mono — optimal for Whisper)
  execSync(`afconvert "${aiffFile}" "${wavFile}" -f WAVE -d LEI16@16000 -c 1`);

  console.log(`Audio file ready → ${wavFile}\n`);
}
