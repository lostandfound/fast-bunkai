/**
 * FastBunkai class - Main API for sentence boundary disambiguation
 * 
 * Mirrors the Python `fast_bunkai.FastBunkai` API
 */
import { segmentRuntime as segmentNative, type SegmentResult } from './native';
import { Annotations, type Span } from './annotations';
import { initializeKuromoji, tokenizeText, convertKuromojiToTokenResult } from './morphological/kuromojiAdapter';

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
  private lastResult: { text: string; result: SegmentResult } | null = null;

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
    const spans: Span[] = [];
    let startIndex = 0;

    for (const token of tokens) {
      const surface = token.surface_form;
      const length = surface.length;

      const tokenResult = convertKuromojiToTokenResult(token);
      
      spans.push({
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
            tuple_pos: (Array.isArray(token.pos) && token.pos.length > 0 
              ? (token.pos as unknown as string[]) as [string, ...string[]]
              : ['*', '*', '*', '*']),
            word_stem: tokenResult.base_form || tokenResult.surface,
            word_surface: tokenResult.surface,
          },
        } as Record<string, unknown>,
      });

      startIndex += length;
    }

    // Handle trailing newline (matching Python version)
    if (startIndex < text.length && text.slice(startIndex) === '\n') {
      spans.push({
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
      });
    }

    return spans;
  }
}

