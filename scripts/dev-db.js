#!/usr/bin/env node

const { execFileSync } = require('child_process');

const ACTIONS = ['reset', 'seed', 'fresh'];

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node scripts/dev-db.js <reset|seed|fresh> [scenario] [--android] [--url <base>]');
  process.exit(1);
}

let android = false;
let urlOverride;
const positional = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--android') {
    android = true;
  } else if (args[i] === '--url') {
    urlOverride = args[++i];
    if (!urlOverride) usage('--url needs a value');
  } else if (args[i].startsWith('--')) {
    usage(`Unknown option "${args[i]}"`);
  } else {
    positional.push(args[i]);
  }
}

const [action, scenario] = positional;
if (!ACTIONS.includes(action)) usage(`Unknown action "${action ?? ''}"`);

const base = (urlOverride || process.env.EXPO_DEV_URL || (android ? 'exp://10.0.2.2:8081' : 'exp://127.0.0.1:8081')).replace(/\/+$/, '');
const params = new URLSearchParams({ action });
if (scenario && action !== 'reset') params.set('scenario', scenario);
const url = `${base}/--/dev/db?${params.toString()}`;

try {
  if (android) {
    execFileSync('adb', ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url], { stdio: 'inherit' });
  } else {
    execFileSync('xcrun', ['simctl', 'openurl', 'booted', url], { stdio: 'inherit' });
  }
} catch (e) {
  console.error(`Failed to open ${url} on the ${android ? 'Android emulator' : 'iOS simulator'}: ${e.message}`);
  process.exit(1);
}

console.log(`Opened ${url}`);
console.log('Watch the Metro logs for "[dev-db] ... done" (or "[dev-db] ... failed").');
