#!/usr/bin/env node
/**
 * CLI entry point - runs the TypeScript CLI using tsx
 * 
 * Uses tsx command to execute TypeScript directly
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliScript = join(__dirname, '../src/cli.ts');
const args = process.argv.slice(2);

// Use tsx from node_modules/.bin
const tsxPath = join(__dirname, '../node_modules/.bin/tsx');
const proc = spawn(tsxPath, [cliScript, ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: true, // For Windows compatibility
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});

