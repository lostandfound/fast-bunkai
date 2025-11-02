#!/usr/bin/env node
/**
 * CLI for fast-bunkai (TypeScript version)
 * 
 * Provides the same pipe-friendly interface as the Python version
 */

import { FastBunkai } from './fastBunkai';
import { readFileSync, existsSync } from 'fs';

const METACHAR_SENTENCE_BOUNDARY = '│';
const METACHAR_LINE_BREAK = '▁';

interface CliOptions {
  input?: string;
  output?: string;
  version?: boolean;
  help?: boolean;
  ma?: boolean; // morphological analysis
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--ma') {
      options.ma = true;
    } else if (arg === '--input' || arg === '-i') {
      options.input = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg.startsWith('--input=') || arg.startsWith('-i=')) {
      options.input = arg.split('=')[1];
    } else if (arg.startsWith('--output=') || arg.startsWith('-o=')) {
      options.output = arg.split('=')[1];
    } else if (!arg.startsWith('-') && !options.input) {
      // Positional argument treated as input file
      options.input = arg;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
Usage: fast-bunkai [OPTIONS] [FILE]

Sentence boundary detection compatible with bunkai CLI

Options:
  -i, --input FILE    Input file path (default: stdin)
  -o, --output FILE   Output file path (default: stdout)
  --ma                Print morphological analysis result like bunkai --ma
  -v, --version        Print version information
  -h, --help          Show this help message

Examples:
  echo "文1。文2！" | fast-bunkai
  fast-bunkai input.txt
  fast-bunkai -i input.txt -o output.txt
`);
}

function showVersion() {
  // Read version from package.json
  try {
    // Use dynamic import for ESM compatibility
    const packageJsonPath = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    console.log(`fast-bunkai ${packageJson.version}`);
  } catch {
    console.log('fast-bunkai unknown');
  }
}

// readInput and writeOutput functions are no longer used in line-by-line processing
// Kept for backwards compatibility if needed

/**
 * Format sentence output (similar to Python's _sentence_output)
 * 
 * @param sentences - Array of sentence strings
 * @returns Formatted output string (without trailing newline, as Python version yields it separately)
 */
function formatOutput(sentences: string[]): string {
  // Format similar to Python version: join with METACHAR_SENTENCE_BOUNDARY
  // Preserve line breaks using METACHAR_LINE_BREAK
  // Matching Python's _sentence_output behavior exactly
  const formatted: string[] = [];
  
  for (let idx = 0; idx < sentences.length; idx++) {
    if (idx > 0) {
      formatted.push(METACHAR_SENTENCE_BOUNDARY);
    }
    // Replace newlines with METACHAR_LINE_BREAK for display
    const formattedSentence = sentences[idx].replace(/\n/g, METACHAR_LINE_BREAK);
    formatted.push(formattedSentence);
  }
  
  return formatted.join('');
}

/**
 * Format morphological analysis output (--ma option)
 * 
 * @param text - Input text
 * @param splitter - FastBunkai instance
 * @returns Formatted morphological analysis output
 */
async function morphOutput(text: string, splitter: FastBunkai): Promise<string> {
  const annotations = await splitter.eos(text);
  const finalSpans = annotations.getFinalLayer();
  const endIndices = new Set(
    finalSpans.map(span => (span as any).end_index || span.end)
  );
  
  const spans = Array.from(
    annotations.getAnnotationLayer('MorphAnnotatorKuromoji')
  ).filter(span => span.rule_name === 'MorphAnnotatorKuromoji')
    .sort((a, b) => (a.start || 0) - (b.start || 0));

  const output: string[] = [];
  const seen = new Set<number>();
  let position = 0;

  for (const span of spans) {
    const tokenArg = span.args?.token;
    if (!tokenArg) continue;

    // Type assertion for token (compatible with TokenResult)
    const token = tokenArg as {
      surface?: string;
      word_surface?: string;
      pos?: string;
      base_form?: string;
      reading?: string;
      phonetic?: string;
      node_obj?: unknown;
    };

    const surface = token.surface || token.word_surface || '';
    if (!surface) continue;

    // Use node_obj as unique identifier if available
    const tokenId = token.node_obj ? 
      (position + Math.random()) : position; // Fallback to position for uniqueness
    if (seen.has(tokenId)) continue;
    seen.add(tokenId);

    const prevPosition = position;

    if (!token.node_obj || surface === '\n') {
      output.push(METACHAR_LINE_BREAK + '\n');
      position += 1;
    } else {
      const node = token.node_obj as { pos?: string[]; conjugated_type?: string; conjugated_form?: string; reading?: string; pronunciation?: string } | null;
      const partOfSpeech = (Array.isArray(node?.pos) ? node.pos.join(',') : null) || token.pos || '*';
      const inflType = node?.conjugated_type || '*';
      const inflForm = node?.conjugated_form || '*';
      const baseForm = token.base_form || surface;
      const reading = token.reading || node?.reading || '*';
      const phonetic = token.phonetic || node?.pronunciation || '*';

      output.push(
        `${surface}\t` +
        `${partOfSpeech},${inflType},${inflForm},${baseForm},${reading},${phonetic}\n`
      );
      position += surface.length;
    }

    // Insert EOS markers
    for (let idx = prevPosition; idx < position; idx++) {
      if (endIndices.has(idx + 1)) {
        output.push('EOS\n');
      }
    }
  }

  return output.join('');
}

/**
 * Process a single line (similar to Python's _process_line)
 * 
 * @param splitter - FastBunkai instance
 * @param line - Input line (may include trailing newline)
 * @param ma - Whether to output morphological analysis
 * @param warned - Whether warning has been shown for METACHAR_SENTENCE_BOUNDARY
 * @returns Tuple of [warned flag, output string]
 */
async function processLine(
  splitter: FastBunkai,
  line: string,
  ma: boolean,
  warned: boolean
): Promise<[boolean, string]> {
  // Remove trailing newline if present (matching Python version)
  const raw = line.endsWith('\n') ? line.slice(0, -1) : line;
  
  let currentWarned = warned;
  let processedRaw = raw;
  
  // Check for METACHAR_SENTENCE_BOUNDARY and show warning if needed
  if (raw.includes(METACHAR_SENTENCE_BOUNDARY)) {
    processedRaw = raw.replace(METACHAR_SENTENCE_BOUNDARY, '');
    if (!currentWarned) {
      process.stderr.write(
        '\x1b[91m' +
        '[Warning] All │ characters will be removed from input to avoid ambiguity\n' +
        '\x1b[0m'
      );
      currentWarned = true;
    }
  }
  
  // Replace METACHAR_LINE_BREAK with actual newline
  const text = processedRaw.replace(METACHAR_LINE_BREAK, '\n');
  
  let output: string;
  if (ma) {
    output = await morphOutput(text, splitter);
  } else {
    const sentences = splitter.segment(text);
    output = formatOutput(sentences);
  }
  
  return [currentWarned, output];
}

/**
 * Read input line by line (streaming) and process each line
 * This matches Python version's behavior
 * 
 * Note: For stdin, we read all at once and split (Node.js limitation in sync mode)
 * For files, we can read line by line more efficiently
 */
function readInputLines(input?: string): string[] {
  if (input && input !== '-' && existsSync(input)) {
    // Read file and split into lines
    const content = readFileSync(input, 'utf-8');
    const lines = content.split(/\r?\n/);
    return lines.map((line, index, array) => {
      // Add newline to all lines except the last if file doesn't end with newline
      if (index === array.length - 1 && !content.endsWith('\n') && !content.endsWith('\r\n')) {
        return line;
      }
      return line + '\n';
    });
  }
  
  // Read from stdin (read all at once due to Node.js limitation)
  // Python version reads line by line from stdin, but Node.js doesn't have
  // a simple synchronous line-by-line reader, so we read all and split
  const stdinContent = readFileSync(0, 'utf-8');
  if (!stdinContent) {
    return [];
  }
  const lines = stdinContent.split(/\r?\n/);
  return lines.map((line, index, array) => {
    // Add newline except for the last line if stdin doesn't end with newline
    if (index === array.length - 1 && !stdinContent.endsWith('\n') && !stdinContent.endsWith('\r\n')) {
      return line;
    }
    return line + '\n';
  });
}

async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  if (options.version) {
    showVersion();
    return;
  }
  
  try {
    const splitter = new FastBunkai();
    let warned = false;
    
    // Read input line by line (matching Python version)
    const lines = readInputLines(options.input);
    
    // Open output writer (file or stdout)
    const { createWriteStream } = await import('fs');
    const outputWriter: NodeJS.WritableStream | null = options.output && options.output !== '-' 
      ? createWriteStream(options.output, { encoding: 'utf-8' })
      : null;
    
    try {
      for (const line of lines) {
        const [newWarned, output] = await processLine(splitter, line, options.ma || false, warned);
        warned = newWarned;
        
        // Write output chunk by chunk (matching Python version's iterator behavior)
        if (outputWriter) {
          outputWriter.write(output);
        } else {
          process.stdout.write(output);
        }
        
        // Add newline after each line's output (matching Python version)
        // Note: _sentence_output always adds a newline at the end
        // _morph_output doesn't add an extra newline (it's already in the output)
        if (!options.ma) {
          if (outputWriter) {
            outputWriter.write('\n');
          } else {
            process.stdout.write('\n');
          }
        }
      }
    } finally {
      // Close file writer if opened (matching Python version)
      if (outputWriter) {
        outputWriter.end();
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

// Handle errors gracefully
// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  main().catch((error) => {
    if (error instanceof Error) {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  });
}

