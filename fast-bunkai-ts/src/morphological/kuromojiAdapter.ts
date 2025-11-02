/**
 * Kuromoji morphological analyzer adapter
 * 
 * Provides a bridge between kuromoji and FastBunkai's annotation system
 */

import kuromoji, { IpadicFeatures } from 'kuromoji';
import type { TokenResult } from '../annotations';

/**
 * Kuromoji tokenizer instance (lazy-loaded)
 */
let tokenizer: kuromoji.Tokenizer<IpadicFeatures> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize kuromoji tokenizer
 * 
 * @param dicPath - Path to kuromoji dictionary (auto-detected if not provided)
 * @returns Promise that resolves when tokenizer is ready
 */
export async function initializeKuromoji(
  dicPath?: string
): Promise<kuromoji.Tokenizer<IpadicFeatures>> {
  // Auto-detect dictionary path if not provided
  if (!dicPath) {
    try {
      // Try to resolve kuromoji package.json to find the package root
      const { createRequire } = await import('module');
      const { dirname, join } = await import('path');
      const require = createRequire(import.meta.url);
      
      // Resolve kuromoji package.json to get package root
      const kuromojiPkg = require.resolve('kuromoji/package.json');
      const kuromojiRoot = dirname(kuromojiPkg);
      dicPath = join(kuromojiRoot, 'dict');
    } catch {
      // Fallback: try relative path from current working directory
      const { resolve } = await import('path');
      dicPath = resolve('node_modules/kuromoji/dict');
    }
  }
  if (tokenizer) {
    return tokenizer;
  }

  if (initPromise) {
    await initPromise;
    return tokenizer!;
  }

  initPromise = new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath })
      .build((err, tok) => {
        if (err) {
          reject(new Error(`Failed to initialize kuromoji: ${err.message}`));
        } else {
          tokenizer = tok;
          resolve();
        }
      });
  });

  await initPromise;
  return tokenizer!;
}

/**
 * Convert kuromoji token to TokenResult
 * 
 * @param token - Kuromoji token
 * @returns TokenResult compatible with Python's TokenResult
 */
export function convertKuromojiToTokenResult(
  token: IpadicFeatures
): TokenResult {
  // kuromoji's pos is an array, convert to comma-separated string (like Janome)
  const posArray = Array.isArray(token.pos) ? token.pos : [];
  const posString = posArray.join(',');

  return {
    surface: token.surface_form,
    pos: posString,
    base_form: token.basic_form || token.surface_form,
    reading: token.reading,
    phonetic: token.pronunciation,
  };
}

/**
 * Tokenize text using kuromoji
 * 
 * @param text - Input text to tokenize
 * @returns Array of kuromoji tokens
 */
export async function tokenizeText(
  text: string
): Promise<IpadicFeatures[]> {
  const tok = await initializeKuromoji();
  return tok.tokenize(text);
}

