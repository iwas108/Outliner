import type { OutlineNode } from '../db/indexedDB';
import { findParent } from './outlineRules';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'as', 'at', 'by',
  'for', 'from', 'in', 'into', 'of', 'off', 'on', 'onto', 'out', 'over', 'to',
  'up', 'with', 'about', 'against', 'between', 'during', 'through', 'under',
  'above', 'below', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'should', 'would', 'could', 'must', 'can',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we',
  'us', 'our', 'he', 'him', 'his', 'she', 'her', 'you', 'your', 'i', 'me', 'my',
  'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom', 'whose', 'not',
  'no', 'yes', 'so', 'very', 'too', 'than', 'then', 'here', 'there', 'just', 'more'
]);

const QUESTION_WORDS = ['who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom'];

/**
 * Tokenizes text and filters out stop words to return keywords.
 */
export function getKeywords(text: string): string[] {
  if (!text) return [];
  // Tokenize: convert to lowercase, match words only, filter out empty/numbers
  const words = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w));

  // Filter out stop words
  return Array.from(new Set(words.filter((w) => !STOP_WORDS.has(w))));
}

/**
 * Checks a line for 5W1H and Question Mark violations.
 */
export interface SyntaxCheckResult {
  isValid: boolean;
  message: string;
}

export function check5W1H(text: string, type: 'section' | 'topic' | 'question' | 'answer'): SyntaxCheckResult | null {
  if (type !== 'question' && type !== 'answer') return null;

  const cleanText = text.trim().toLowerCase();

  if (type === 'question') {
    const hasQuestionMark = cleanText.includes('?');
    const words = cleanText.split(/\s+/);
    const has5W1H = QUESTION_WORDS.some((qw) => words.includes(qw));

    if (!hasQuestionMark && !has5W1H) {
      return {
        isValid: false,
        message: 'Question lines must contain a 5W1H word (Who, What, etc.) AND end with a question mark (?).',
      };
    }
    if (!hasQuestionMark) {
      return {
        isValid: false,
        message: 'Question lines must end with a question mark (?).',
      };
    }
    if (!has5W1H) {
      return {
        isValid: false,
        message: 'Question lines should contain at least one 5W1H question word (e.g. Who, What, Why).',
      };
    }
  }

  if (type === 'answer') {
    const hasQuestionMark = cleanText.includes('?');
    if (hasQuestionMark) {
      return {
        isValid: false,
        message: 'Answer lines must not contain question marks (?).',
      };
    }
  }

  return { isValid: true, message: '' };
}

/**
 * Runs keyword chaining checks across the entire outline.
 * Each child Q/A line must share at least one keyword with its parent node.
 */
export function checkKeywordChaining(nodes: OutlineNode[]): { [nodeId: string]: string } {
  const violations: { [nodeId: string]: string } = {};

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    // Skip section (depth 0) and topic (depth 1) nodes from chaining rules
    if (node.depth <= 1) continue;
    if (node.type !== 'question' && node.type !== 'answer') continue;
    if (!node.text.trim()) continue;

    // Find parent node
    const parent = findParent(nodes, i, node.depth - 1);
    if (!parent || !parent.text.trim()) continue; // Parent is empty/missing, skip checking
    if (parent.depth <= 1) continue; // Skip chaining validation if parent is Section (0) or Topic (1)

    const currentKeywords = getKeywords(node.text);
    const parentKeywords = getKeywords(parent.text);

    // If both have keywords, verify there is at least one overlap
    if (currentKeywords.length > 0 && parentKeywords.length > 0) {
      const hasChain = currentKeywords.some((w) => parentKeywords.includes(w));
      if (!hasChain) {
        violations[node.id] = `Keyword Chaining Violation: This line does not share any key words with its parent "${parent.type.toUpperCase()}" node.`;
      }
    }
  }

  return violations;
}

/**
 * Extracts and maps repeated keywords to stable HSL colors.
 * Keywords appearing at least twice across the document are tagged.
 */
export function getKeywordColors(nodes: OutlineNode[], isDark: boolean): { [word: string]: string } {
  const wordCounts: { [word: string]: number } = {};
  
  // Count keyword frequencies (skip section and topic nodes)
  nodes.forEach((node) => {
    if (!node.text.trim()) return;
    if (node.depth <= 1) return; // Exclude section (0) and topic (1) from highlighting
    const keywords = getKeywords(node.text);
    keywords.forEach((w) => {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    });
  });

  // Keep keywords appearing at least twice
  const repeatKeywords = Object.keys(wordCounts).filter((w) => wordCounts[w] >= 2);

  const colors: { [word: string]: string } = {};
  repeatKeywords.forEach((word) => {
    // Generate stable hash from word string
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    // Premium theme-harmonized settings: dark mode uses lower lightness, light mode uses higher/softer lightness
    const sat = 75; // %
    const light = isDark ? 25 : 88; // %
    const textLight = isDark ? 90 : 20; // %
    
    colors[word] = `hsl(${hue}, ${sat}%, ${light}%)|hsl(${hue}, ${sat}%, ${textLight}%)`;
  });

  return colors;
}
