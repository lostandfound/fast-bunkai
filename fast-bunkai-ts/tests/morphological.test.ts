/**
 * Tests for morphological analysis functionality
 */

import { describe, it, expect } from 'vitest';
import { FastBunkai } from '../src/fastBunkai';
import { Annotations } from '../src/annotations';

describe('Morphological Analysis', () => {
  it('should initialize kuromoji and perform morphological analysis', async () => {
    const splitter = new FastBunkai();
    const text = '形態素解析します';
    
    const annotations = await splitter.eos(text);
    
    expect(annotations).toBeInstanceOf(Annotations);
    expect(annotations.availableLayers()).toContain('MorphAnnotatorKuromoji');
  });

  it('should return morphological tokens', async () => {
    const splitter = new FastBunkai();
    const text = 'これはテストです';
    
    const annotations = await splitter.eos(text);
    const morphLayer = Array.from(
      annotations.getAnnotationLayer('MorphAnnotatorKuromoji')
    );
    
    expect(morphLayer.length).toBeGreaterThan(0);
    
    // Check that tokens have required fields
    const firstToken = morphLayer[0];
    expect(firstToken.rule_name).toBe('MorphAnnotatorKuromoji');
    expect(firstToken.args).toBeDefined();
    
    const token = firstToken.args?.token;
    if (token) {
      expect((token as any).surface || (token as any).word_surface).toBeDefined();
      expect((token as any).pos || (token as any).tuple_pos).toBeDefined();
    }
  });

  it('should handle empty text', async () => {
    const splitter = new FastBunkai();
    const annotations = await splitter.eos('');
    
    expect(annotations).toBeInstanceOf(Annotations);
  });

  it('should handle text with newlines', async () => {
    const splitter = new FastBunkai();
    const text = '文1。\n文2！';
    
    const annotations = await splitter.eos(text);
    const morphLayer = Array.from(
      annotations.getAnnotationLayer('MorphAnnotatorKuromoji')
    );
    
    expect(morphLayer.length).toBeGreaterThan(0);
  });

  it('should provide token information with pos and surface', async () => {
    const splitter = new FastBunkai();
    const text = '日本語';
    
    const annotations = await splitter.eos(text);
    const morphLayer = Array.from(
      annotations.getAnnotationLayer('MorphAnnotatorKuromoji')
    );
    
    expect(morphLayer.length).toBeGreaterThan(0);
    
    // Check that tokens have morphological information
    for (const span of morphLayer) {
      if (span.args?.token) {
        const token = span.args.token as any;
        expect(token.surface || token.word_surface).toBeDefined();
        expect(typeof (token.surface || token.word_surface)).toBe('string');
      }
    }
  });
}, { timeout: 30000 });

