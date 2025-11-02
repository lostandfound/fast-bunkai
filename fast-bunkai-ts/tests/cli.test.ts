/**
 * CLI tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const BIN_PATH = join(__dirname, '../bin/fast-bunkai.mjs');

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
    // Use the bin script instead of ts-node
    const binPath = join(__dirname, '../bin/fast-bunkai.mjs');
    const result = execSync(`echo "${input}" | node ${binPath}`, {
      encoding: 'utf-8',
    });
    expect(result).toContain('文1。');
    expect(result).toContain('文2！');
  });

  it('should process file input', () => {
    writeFileSync(testInputFile, '文1。文2！', 'utf-8');
    const binPath = join(__dirname, '../bin/fast-bunkai.mjs');
    const result = execSync(`node ${binPath} ${testInputFile}`, {
      encoding: 'utf-8',
    });
    expect(result).toContain('文1。');
    expect(result).toContain('文2！');
  });

  it('should output to file', () => {
    writeFileSync(testInputFile, '文1。文2！', 'utf-8');
    execSync(`node ${BIN_PATH} -i ${testInputFile} -o ${testOutputFile}`, {
      encoding: 'utf-8',
    });
    expect(existsSync(testOutputFile)).toBe(true);
    const output = readFileSync(testOutputFile, 'utf-8');
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

