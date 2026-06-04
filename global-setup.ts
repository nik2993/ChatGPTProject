import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import testData from './data/testData';

export default function globalSetup(): void {
  const audioDir = path.join(__dirname, 'data');
  const wavFile  = path.join(audioDir, 'question.wav');
  const question = testData.playwrightQuestion;

  fs.mkdirSync(audioDir, { recursive: true });
  console.log(`\nGenerating audio for: "${question}"`);

  const platform = os.platform();

  if (platform === 'darwin') {
    // Mac: built-in 'say' for TTS, 'afconvert' for WAV conversion
    // [[slnc 8000]] adds 8s silence after speech to prevent audio looping in Chrome
    const aiffFile = path.join(audioDir, 'question.aiff');
    execSync(`say "${question} [[slnc 8000]]" -o "${aiffFile}"`);
    execSync(`afconvert "${aiffFile}" "${wavFile}" -f WAVE -d LEI16@16000 -c 1`);

  } else if (platform === 'linux') {
    // Linux (GitHub Actions / Jenkins / Ubuntu)
    // Requires: sudo apt-get install -y espeak-ng
    // ffmpeg is pre-installed on GitHub Actions ubuntu-latest
    const tmpWav = path.join(audioDir, 'question_tmp.wav');
    execSync(`espeak-ng "${question}" -w "${tmpWav}"`);
    execSync(`ffmpeg -y -i "${tmpWav}" -af "apad=pad_dur=8" "${wavFile}"`);

  } else if (platform === 'win32') {
    // Windows: PowerShell built-in SAPI — no install needed
    const escapedPath = wavFile.replace(/\\/g, '\\\\');
    execSync(
      `powershell -Command "Add-Type -AssemblyName System.Speech; ` +
      `$tts = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
      `$tts.SetOutputToWaveFile('${escapedPath}'); ` +
      `$tts.Speak('${question}'); ` +
      `$tts.SetOutputToDefaultAudioDevice()"`
    );
  }

  console.log(`Audio file ready → ${wavFile}\n`);
}
