#!/usr/bin/env node
/**
 * CLI for fast-bunkai (TypeScript version)
 * 
 * Provides the same pipe-friendly interface as the Python version
 */

import { FastBunkai } from './fastBunkai';
import { readFileSync, writeFileSync, existsSync } from 'fs';

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

function readInput(input?: string): string {
  if (input && input !== '-' && existsSync(input)) {
    return readFileSync(input, 'utf-8');
  }
  
  // Read from stdin
  return readFileSync(0, 'utf-8');
}

function writeOutput(content: string, output?: string) {
  if (output && output !== '-') {
    writeFileSync(output, content, 'utf-8');
  } else {
    process.stdout.write(content);
  }
}

function formatOutput(sentences: string[]): string {
  // Format similar to Python version: join with METACHAR_SENTENCE_BOUNDARY
  // Preserve line breaks using METACHAR_LINE_BREAK
  const formatted: string[] = [];
  
  for (const sentence of sentences) {
    // Replace newlines with METACHAR_LINE_BREAK for display
    const formattedSentence = sentence.replace(/\n/g, METACHAR_LINE_BREAK);
    formatted.push(formattedSentence);
  }
  
  // Join sentences with boundary marker
  return formatted.join(METACHAR_SENTENCE_BOUNDARY);
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
    const text = readInput(options.input);
    
    if (!text.trim()) {
      // Empty input, exit gracefully
      return;
    }
    
    let output: string;
    if (options.ma) {
      // Morphological analysis output
      output = await morphOutput(text, splitter);
    } else {
      // Sentence segmentation output
      const sentences = splitter.segment(text);
      output = formatOutput(sentences);
      // Add newline if outputting to stdout
      if (!options.output || options.output === '-') {
        output += '\n';
      }
    }
    
    writeOutput(output, options.output);
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

