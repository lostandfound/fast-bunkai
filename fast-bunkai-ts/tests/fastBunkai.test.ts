/**
 * Basic tests for FastBunkai
 * 
 * Note: These tests require the native bindings to be built.
 * Run `npm run build` before running tests.
 */

import { describe, it, expect } from 'vitest';
import { FastBunkai } from '../src';

describe('FastBunkai', () => {
  const splitter = new FastBunkai();

  it('should segment simple Japanese text', () => {
    const text = '文1。文2！文3？';
    const sentences = splitter.segment(text);
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe('文1。');
    expect(sentences[1]).toBe('文2！');
    expect(sentences[2]).toBe('文3？');
  });

  it('should handle emoji', () => {
    const text = '羽田から✈️出発して、友だちと🍣食べました。最高！';
    const sentences = splitter.segment(text);
    expect(sentences.length).toBeGreaterThan(0);
    // Emoji should be preserved in sentences
    expect(sentences.some(s => s.includes('✈️'))).toBe(true);
    expect(sentences.some(s => s.includes('🍣'))).toBe(true);
  });

  it('should find EOS indices', () => {
    const text = '文1。文2！';
    const eosIndices = splitter.findEos(text);
    expect(eosIndices.length).toBeGreaterThan(0);
    // EOS indices should be valid UTF-16 indices
    eosIndices.forEach((idx) => {
      expect(typeof idx).toBe('number');
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(text.length);
    });
  });

  it('should handle empty text', () => {
    const sentences = splitter.segment('');
    expect(sentences).toHaveLength(1);
    expect(sentences[0]).toBe('');
  });

  it('should handle text without sentence boundaries', () => {
    const text = '文末記号がないテキスト';
    const sentences = splitter.segment(text);
    expect(sentences.length).toBeGreaterThan(0);
  });
});

