/**
 * Type definitions for annotation structures
 * 
 * Mirrors Python's `fast_bunkai.annotations` module
 */

/**
 * A span annotation with rule information
 */
export interface Span {
  /** Name of the rule that created this span */
  rule_name: string;
  /** Start index (UTF-16 code units) */
  start: number;
  /** End index (UTF-16 code units) */
  end: number;
  /** Type of split, if any */
  split_type?: string;
  /** Value of split, if any */
  split_value?: string;
  /** Additional arguments (e.g., token information) */
  args?: Record<string, unknown>;
}

/**
 * An annotation layer containing multiple spans
 */
export interface AnnotationLayer {
  /** Name of the annotation layer */
  name: string;
  /** Spans in this layer */
  spans: Span[];
}

/**
 * Complete segmentation result with annotations
 */
export interface AnnotationResult {
  /** Annotation layers */
  layers: AnnotationLayer[];
  /** Final sentence boundary indices (UTF-16 code units) */
  final_boundaries: number[];
}

/**
 * Token result (for morphological analysis, if supported)
 * 
 * Compatible with Python's TokenResult structure
 */
export interface TokenResult {
  /** Surface form */
  surface: string;
  /** Part of speech (comma-separated string) */
  pos: string;
  /** Base form */
  base_form?: string;
  /** Reading */
  reading?: string;
  /** Phonetic (pronunciation) */
  phonetic?: string;
  /** Original token object (for compatibility with Python's node_obj) */
  node_obj?: unknown;
  /** Part of speech as tuple (for compatibility) */
  tuple_pos?: [string, ...string[]];
  /** Word stem (for compatibility) */
  word_stem?: string;
  /** Word surface (for compatibility) */
  word_surface?: string;
}

/**
 * Annotations class - manages annotation layers
 * 
 * Mirrors Python's `fast_bunkai.annotations.Annotations` class
 */
export class Annotations {
  private name2spans: Map<string, Span[]> = new Map();
  private name2order: Map<string, number> = new Map();
  private annotatorForward: string | null = null;
  private currentOrder = 0;

  /**
   * Add an annotation layer
   * 
   * @param annotatorName - Name of the annotator/layer
   * @param annotations - List of spans for this layer
   */
  addAnnotationLayer(annotatorName: string, annotations: Span[]): void {
    this.name2spans.set(annotatorName, annotations);
    this.name2order.set(annotatorName, this.currentOrder);
    this.annotatorForward = annotatorName;
    this.currentOrder += 1;
  }

  /**
   * Get the final layer (last added layer)
   * 
   * @returns List of spans in the final layer
   */
  getFinalLayer(): Span[] {
    if (!this.annotatorForward) {
      return [];
    }
    const spans = this.name2spans.get(this.annotatorForward) || [];
    // Return spans with end_index for compatibility (if using start/end instead)
    return spans.map(span => ({
      ...span,
      end_index: span.end || span.start + 1,
      start_index: span.start || 0,
    }));
  }

  /**
   * Get spans from a specific annotation layer
   * 
   * @param layerName - Name of the layer
   * @returns Iterator of spans
   */
  *getAnnotationLayer(layerName: string): Generator<Span> {
    const layerSpans = this.name2spans.get(layerName);
    if (layerSpans) {
      for (const span of layerSpans) {
        yield span;
      }
    }
  }

  /**
   * Get all available layer names
   * 
   * @returns Array of layer names
   */
  availableLayers(): string[] {
    return Array.from(this.name2spans.keys());
  }

  /**
   * Flatten all annotations into a single iterator
   * 
   * @returns Iterator of all spans
   */
  *flatten(): Generator<Span> {
    for (const spans of this.name2spans.values()) {
      for (const span of spans) {
        yield span;
      }
    }
  }
}

/**
 * SpanAnnotation - compatible with Python's SpanAnnotation
 * 
 * Note: This is kept for compatibility but uses the Span interface
 */
export type SpanAnnotation = Span;
