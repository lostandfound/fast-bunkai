/**
 * FastBunkai class - Main API for sentence boundary disambiguation
 * 
 * Mirrors the Python `fast_bunkai.FastBunkai` API
 */
import { segmentRuntime as segmentNative } from './native';

/**
 * FastBunkai sentence boundary disambiguation
 * 
 * Usage:
 * ```typescript
 * const splitter = new FastBunkai();
 * const sentences = splitter.segment("文1。文2！文3？");
 * // or
 * for (const sentence of splitter("文1。文2！文3？")) {
 *   console.log(sentence);
 * }
 * ```
 */
export class FastBunkai {
  /**
   * Segment text into sentences
   * 
   * @param text - Input text to segment
   * @returns Array of sentence strings
   */
  segment(text: string): string[] {
    const result = segmentNative(text);
    return result.sentences;
  }

  /**
   * Find end-of-sentence indices
   * 
   * @param text - Input text
   * @returns Array of UTF-16 code unit indices where sentences end
   */
  findEos(text: string): number[] {
    const result = segmentNative(text);
    // Native binding uses snake_case (eos_indices)
    return result.eos_indices ?? [];
  }

  /**
   * Callable interface (Python-style)
   * 
   * @param text - Input text to segment
   * @returns Generator of sentence strings
   */
  *[Symbol.iterator](text: string): Generator<string> {
    for (const sentence of this.segment(text)) {
      yield sentence;
    }
  }

  /**
   * Callable interface (makes instance callable like a function)
   * Note: TypeScript doesn't support callable objects directly,
   * but we can use a workaround with a method
   */
  call(text: string): Generator<string> {
    return this[Symbol.iterator](text);
  }
}

