/**
 * CLI tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(__dirname, '../src/cli.ts');

describe('CLI', () => {
  const testInputFile = join(__dirname, 'test-input.txt');
  const testOutputFile = join(__dirname, 'test-output.txt');

  beforeEach(() => {
    // Clean up test files
    if (existsSync(testInputFile)) {
      unlinkSync(testInputFile);
    }
    if (existsSync(testOutputFile)) {
      unlinkSync(testOutputFile);
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testInputFile)) {
      unlinkSync(testInputFile);
    }
    if (existsSync(testOutputFile)) {
      unlinkSync(testOutputFile);
    }
  });

  it('should process stdin input', () => {
    const input = '文1。文2！';
    const result = execSync(`echo "${input}" | node --loader ts-node/esm ${CLI_PATH}`, {
      encoding: 'utf-8',
      env: { ...process.env, NODE_OPTIONS: '--loader ts-node/esm' },
    });
    expect(result).toContain('文1。');
    expect(result).toContain('文2！');
  });

  it('should process file input', () => {
    writeFileSync(testInputFile, '文1。文2！', 'utf-8');
    const result = execSync(`node --loader ts-node/esm ${CLI_PATH} ${testInputFile}`, {
      encoding: 'utf-8',
    });
    expect(result).toContain('文1。');
    expect(result).toContain('文2！');
  });

  it('should output to file', () => {
    writeFileSync(testInputFile, '文1。文2！', 'utf-8');
    execSync(`node --loader ts-node/esm ${CLI_PATH} -i ${testInputFile} -o ${testOutputFile}`, {
      encoding: 'utf-8',
    });
    expect(existsSync(testOutputFile)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const output = require('fs').readFileSync(testOutputFile, 'utf-8');
    expect(output).toContain('文1。');
    expect(output).toContain('文2！');
  });

  it('should show version', () => {
    const result = execSync(`node --loader ts-node/esm ${CLI_PATH} --version`, {
      encoding: 'utf-8',
    });
    expect(result.trim()).toMatch(/fast-bunkai \d+\.\d+\.\d+/);
  });

  it('should show help', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const result = execSync(`node --loader ts-node/esm ${CLI_PATH} --help`, {
      encoding: 'utf-8',
    });
    expect(result).toContain('Usage:');
    expect(result).toContain('Options:');
  });
});

