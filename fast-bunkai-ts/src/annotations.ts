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
 */
export interface TokenResult {
  /** Surface form */
  surface: string;
  /** Part of speech */
  pos: string;
  /** Base form */
  base_form?: string;
  /** Reading */
  reading?: string;
}

