import fs from 'node:fs';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { validate } from './validate.mjs';

const file = new URL('../content/site.json', import.meta.url);
const site = JSON.parse(fs.readFileSync(file, 'utf8'));
const input = readline.createInterface({ input: stdin, output: stdout });
console.log('Make this portfolio yours. Press Enter to keep a value.\n');
try {
  for (const [group,key,label] of [
    ['profile','name','Your name'], ['profile','initials','Initials (1–3 letters)'],
    ['profile','email','Contact email'], ['profile','location','City'],
    ['profile','timezone','Timezone, e.g. Asia/Jakarta'],
    ['meta','url','Full website URL, ending in /'],
  ]) {
    const answer = (await input.question(`${label} [${site[group][key]}]: `)).trim();
    if (answer) site[group][key] = answer;
  }
  validate(site);
  fs.writeFileSync(file, JSON.stringify(site, null, 2) + '\n');
  console.log('\nSaved content/site.json. Next: replace the portrait, both language biographies, project examples, and social links. Run npm run dev to preview.');
} catch (error) {
  console.error(`Nothing saved: ${error.message}`);
  process.exitCode = 1;
} finally { input.close(); }
