/**
 * FastBunkai class - Main API for sentence boundary disambiguation
 * 
 * Mirrors the Python `fast_bunkai.FastBunkai` API
 */
import { segmentRuntime as segmentNative, type SegmentResult } from './native';
import { Annotations, type Span } from './annotations';
import { initializeKuromoji, tokenizeText, convertKuromojiToTokenResult } from './morphological/kuromojiAdapter';
import type { IpadicFeatures } from 'kuromoji';

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
  private static readonly LARGE_TEXT_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MiB
  private lastResult: { text: string; result: SegmentResult } | null = null;

  /**
   * Warn if text is too large (similar to Python version)
   * 
   * @param text - Input text to check
   * @private
   */
  private warnLargeText(text: string): void {
    // Quick check: if text length * 4 (approximate UTF-8 bytes) < threshold, skip
    if (text.length * 4 < FastBunkai.LARGE_TEXT_THRESHOLD_BYTES) {
      return;
    }
    
    // Calculate actual UTF-8 byte size
    const textBytes = new TextEncoder().encode(text).length;
    if (textBytes < FastBunkai.LARGE_TEXT_THRESHOLD_BYTES) {
      return;
    }
    
    const sizeMib = textBytes / (1024 * 1024);
    // Use process.stderr.write for consistency with Python's warnings
    process.stderr.write(
      `Warning: fast-bunkai received approximately ${sizeMib.toFixed(2)} MiB of text; ` +
      'segmentation may consume large memory due to intermediate annotations.\n'
    );
  }

  /**
   * Get segmentation result, using cache if the same text is requested
   * 
   * @param text - Input text to segment
   * @returns Segmentation result
   * @private
   */
  private getSegmentResult(text: string): SegmentResult {
    if (this.lastResult?.text === text) {
      return this.lastResult.result;
    }
    this.warnLargeText(text);
    const result = segmentNative(text);
    this.lastResult = { text, result };
    return result;
  }

  /**
   * Segment text into sentences
   * 
   * @param text - Input text to segment
   * @returns Array of sentence strings
   */
  segment(text: string): string[] {
    return this.getSegmentResult(text).sentences;
  }

  /**
   * Find end-of-sentence indices
   * 
   * @param text - Input text
   * @returns Array of UTF-16 code unit indices where sentences end
   */
  findEos(text: string): number[] {
    return this.getSegmentResult(text).eos_indices ?? [];
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

  /**
   * Get annotations with morphological analysis
   * 
   * Note: This is an async method (unlike Python version) due to kuromoji's async initialization
   * 
   * @param text - Input text
   * @returns Annotations object with morphological analysis layer
   */
  async eos(text: string): Promise<Annotations> {
    await initializeKuromoji();
    this.warnLargeText(text);

    const result = segmentNative(text);
    const annotations = new Annotations();

    // Add annotation layers from Rust segmentation result
    let basicRuleFound = false;
    for (const layer of result.layers) {
      const spans: Span[] = layer.spans.map(span => ({
        rule_name: span.rule_name,
        start: span.start,
        end: span.end,
        split_type: span.split_type,
        split_value: span.split_value,
        args: undefined,
      }));
      annotations.addAnnotationLayer(layer.name, spans);

      // Check if BasicRule layer is found
      if (layer.name === 'BasicRule') {
        basicRuleFound = true;
      }
    }

    // If BasicRule layer is found, add morphological analysis layer
    if (basicRuleFound) {
      const morphSpans = await this._buildMorphLayer(text);
      const existingSpans = Array.from(annotations.flatten());
      const combined: Span[] = [
        ...morphSpans,
        ...existingSpans,
      ];
      annotations.addAnnotationLayer('MorphAnnotatorKuromoji', combined);
    }

    return annotations;
  }

  /**
   * Build morphological analysis layer using kuromoji
   * 
   * @param text - Input text
   * @returns Array of spans with morphological information
   * @private
   */
  private async _buildMorphLayer(text: string): Promise<Span[]> {
    const tokens = await tokenizeText(text);
    return this._tokensToSpans(tokens, text);
  }

  /**
   * Convert kuromoji tokens to span annotations
   * 
   * @param tokens - Tokenized results from kuromoji
   * @param originalText - Original input text
   * @returns Array of spans
   * @private
   */
  private _tokensToSpans(
    tokens: IpadicFeatures[],
    originalText: string
  ): Span[] {
    const spans: Span[] = [];
    let startIndex = 0;

    for (const token of tokens) {
      spans.push(this._createTokenSpan(token, startIndex));
      startIndex += token.surface_form.length;
    }

    // Handle trailing newline
    const trailingNewlineSpan = this._createTrailingNewlineSpan(startIndex, originalText);
    if (trailingNewlineSpan) {
      spans.push(trailingNewlineSpan);
    }

    return spans;
  }

  /**
   * Create a span annotation for a single token
   * 
   * @param token - Kuromoji token
   * @param startIndex - Start position in UTF-16 code units
   * @returns Span annotation
   * @private
   */
  private _createTokenSpan(
    token: IpadicFeatures,
    startIndex: number
  ): Span {
    const surface = token.surface_form;
    const length = surface.length;
    const tokenResult = convertKuromojiToTokenResult(token);
    
    return {
      rule_name: 'MorphAnnotatorKuromoji',
      start: startIndex,
      end: startIndex + length,
      split_type: 'kuromoji',
      split_value: 'token',
      args: { 
        token: {
          ...tokenResult,
          // Keep original kuromoji token as node_obj (for compatibility)
          node_obj: token,
          tuple_pos: this._normalizePos(token.pos),
          word_stem: tokenResult.base_form || tokenResult.surface,
          word_surface: tokenResult.surface,
        },
      } as Record<string, unknown>,
    };
  }

  /**
   * Normalize part-of-speech array to tuple format
   * 
   * @param pos - POS from kuromoji (can be string, string[], or undefined)
   * @returns Normalized POS tuple
   * @private
   */
  private _normalizePos(pos: string | string[] | undefined): [string, ...string[]] {
    if (Array.isArray(pos) && pos.length > 0) {
      return pos as unknown as [string, ...string[]];
    }
    return ['*', '*', '*', '*'];
  }

  /**
   * Create span for trailing newline if present
   * 
   * @param startIndex - Current position after processing tokens
   * @param text - Original text
   * @returns Span for trailing newline, or null if not present
   * @private
   */
  private _createTrailingNewlineSpan(startIndex: number, text: string): Span | null {
    if (startIndex >= text.length || text.slice(startIndex) !== '\n') {
      return null;
    }
    
    return {
      rule_name: 'MorphAnnotatorKuromoji',
      start: startIndex,
      end: text.length,
      split_type: 'kuromoji',
      split_value: 'token',
      args: {
        token: {
          node_obj: null,
          tuple_pos: ['記号', '空白', '*', '*'],
          word_stem: '\n',
          word_surface: '\n',
        },
      },
    };
  }
}

