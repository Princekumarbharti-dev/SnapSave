import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('release', { recursive: true });
execFileSync('powershell', ['-NoProfile', '-Command', "Compress-Archive -Path 'dist\\*' -DestinationPath 'release\\snapsave-1.0.0.zip' -Force"], { stdio: 'inherit' });
console.log('Created release/snapsave-1.0.0.zip');