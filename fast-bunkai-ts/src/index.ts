/**
 * FastBunkai - Rust-accelerated sentence boundary detection
 * 
 * Compatible with bunkai's FastBunkai API
 */
export { FastBunkai } from './fastBunkai';
export * from './annotations';
export { segmentRuntime as segment, SegmentResult } from './native';

