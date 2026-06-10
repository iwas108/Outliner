import nlp from 'compromise';
import type { OutlineNode } from '../db/indexedDB';

// ─────────────────────────────────────────────────────────
// Stop-word list
// ─────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'as', 'at', 'by',
  'for', 'from', 'in', 'into', 'of', 'off', 'on', 'onto', 'out', 'over', 'to',
  'up', 'with', 'about', 'against', 'between', 'during', 'through', 'under',
  'above', 'below', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'should', 'would', 'could', 'must', 'can',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we',
  'us', 'our', 'he', 'him', 'his', 'she', 'her', 'you', 'your', 'i', 'me', 'my',
  'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom', 'whose', 'not',
  'no', 'yes', 'so', 'very', 'too', 'than', 'then', 'here', 'there', 'just', 'more',
  'such', 'each', 'both', 'any', 'all', 'some', 'may', 'might', 'shall', 'will',
  'also', 'only', 'even', 'well', 'back', 'per', 'via', 'e.g', 'i.e'
]);

const QUESTION_WORDS = ['who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom'];

// ─────────────────────────────────────────────────────────
// POS category normalization
// Maps compromise's Penn Treebank tags to simplified categories.
// ─────────────────────────────────────────────────────────
type POSCategory = 'Noun' | 'Verb' | 'Adjective' | 'Adverb' | 'Other';

function normalizePOSTag(penn: string | undefined): POSCategory {
  if (!penn) return 'Other';
  if (penn.startsWith('NN')) return 'Noun';    // NN, NNS, NNP, NNPS
  if (penn.startsWith('VB')) return 'Verb';    // VB, VBD, VBG, VBN, VBP, VBZ
  if (penn.startsWith('JJ')) return 'Adjective'; // JJ, JJR, JJS
  if (penn.startsWith('RB')) return 'Adverb';  // RB, RBR, RBS
  return 'Other';
}

/**
 * Returns a map from lowercase word → POS category for every content word in the text.
 * Uses compromise with Penn Treebank tagging.
 */
export function getWordPOSTags(text: string): Map<string, POSCategory> {
  const result = new Map<string, POSCategory>();
  if (!text || !text.trim()) return result;

  try {
    const doc = nlp(text);
    doc.compute('penn');
    const terms = doc.json() as Array<{ terms: Array<{ text: string; penn?: string }> }>;
    for (const sentence of terms) {
      for (const term of sentence.terms) {
        const word = term.text.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length > 1 && !STOP_WORDS.has(word)) {
          result.set(word, normalizePOSTag(term.penn));
        }
      }
    }
  } catch {
    // Silently degrade — compromise may fail on unusual input
  }

  return result;
}

// ─────────────────────────────────────────────────────────
// Keyword extraction
// ─────────────────────────────────────────────────────────

/**
 * Tokenizes text and filters out stop words to return meaningful keywords.
 */
export function getKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w));

  return Array.from(new Set(words.filter((w) => !STOP_WORDS.has(w))));
}

// ─────────────────────────────────────────────────────────
// 5W1H Syntax check
// ─────────────────────────────────────────────────────────

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
      return { isValid: false, message: 'Question lines must end with a question mark (?).' };
    }
    if (!has5W1H) {
      return {
        isValid: false,
        message: 'Question lines should contain at least one 5W1H question word (e.g. Who, What, Why).',
      };
    }
  }

  if (type === 'answer') {
    if (cleanText.includes('?')) {
      return { isValid: false, message: 'Answer lines must not contain question marks (?).' };
    }
  }

  return { isValid: true, message: '' };
}

// ─────────────────────────────────────────────────────────
// Chaining partners — sequential Q→A flow
// ─────────────────────────────────────────────────────────

/**
 * Returns the chaining partners for a Q/A node at `index`.
 *
 * The chaining model enforces sequential cohesion within a topic
 * (and nested sub-topics) at every depth level:
 *
 *   - **Question nodes**: Chain with the *answer(s)* of the immediately
 *     preceding sibling question under the same parent. The first question
 *     under any parent has no chaining partners (it introduces a new thread).
 *
 *   - **Answer nodes**:
 *     - The **first** answer under a question chains with the parent question.
 *     - The **2nd+ answers** chain with the immediately preceding sibling
 *       answer AND the parent question. A violation is raised only if the
 *       answer shares no keywords with *either* partner.
 *
 * Structural headers (Section depth 0, Topic depth 1) are never partners.
 */
function getChainingPartners(nodes: OutlineNode[], index: number): OutlineNode[] {
  const node = nodes[index];
  if (node.depth <= 1) return []; // Sections and Topics don't chain

  // ── Locate the structural parent ──
  // Walk backwards to find the first node with depth = node.depth - 1.
  let parentIndex = -1;
  for (let i = index - 1; i >= 0; i--) {
    if (nodes[i].depth === node.depth - 1) {
      parentIndex = i;
      break;
    }
    if (nodes[i].depth < node.depth - 1) break; // crossed boundary
  }

  if (parentIndex === -1) return [];

  // ── Answer nodes → chain with previous sibling answer OR parent question ──
  if (node.type === 'answer') {
    const parent = nodes[parentIndex];
    // Only chain if the parent is a Q/A content node (depth >= 2)
    if (parent.depth < 2 || !parent.text.trim()) return [];

    // Look for the immediately preceding sibling answer (same depth, same parent scope)
    let prevSiblingAnswer: OutlineNode | null = null;
    for (let i = index - 1; i > parentIndex; i--) {
      // Stop if we cross out of the parent's direct children scope
      if (nodes[i].depth < node.depth) break;
      if (nodes[i].depth === node.depth && nodes[i].type === 'answer' && nodes[i].text.trim()) {
        prevSiblingAnswer = nodes[i];
        break;
      }
    }

    if (prevSiblingAnswer) {
      // 2nd+ answer: chain with previous sibling answer OR parent question
      return [prevSiblingAnswer, parent];
    }

    // First answer under the parent question: chain with the parent question only
    return [parent];
  }

  // ── Question nodes → chain with answers of the previous sibling question ──
  if (node.type === 'question') {
    // Determine the scope boundary: the parent's index defines the
    // earliest position within which same-depth siblings live.

    // Check whether this is the first question at this depth under this parent.
    let isFirstQuestion = true;
    for (let i = parentIndex + 1; i < index; i++) {
      if (nodes[i].depth === node.depth && nodes[i].type === 'question') {
        isFirstQuestion = false;
        break;
      }
      // If we exit the parent's scope, stop scanning.
      if (nodes[i].depth < node.depth - 1) break;
    }

    if (isFirstQuestion) {
      return []; // First question under a parent introduces a new thread
    }

    // Find the immediately preceding sibling question at the same depth.
    let prevQIndex = -1;
    for (let i = index - 1; i > parentIndex; i--) {
      if (nodes[i].depth === node.depth && nodes[i].type === 'question') {
        prevQIndex = i;
        break;
      }
      // If we exit the parent's scope, stop scanning.
      if (nodes[i].depth < node.depth - 1) break;
    }

    if (prevQIndex === -1) return [];

    // Collect answers that are direct children of the previous question
    // (depth = prevQ.depth + 1, type = 'answer') between prevQIndex and
    // the current node index.
    const partners: OutlineNode[] = [];
    for (let i = prevQIndex + 1; i < index; i++) {
      // Stop if we exit the previous question's subtree
      if (nodes[i].depth <= nodes[prevQIndex].depth) break;
      // Only collect direct children (depth = prevQ.depth + 1) that are answers
      if (
        nodes[i].depth === nodes[prevQIndex].depth + 1 &&
        nodes[i].type === 'answer' &&
        nodes[i].text.trim()
      ) {
        partners.push(nodes[i]);
      }
    }

    return partners;
  }

  return [];
}

// ─────────────────────────────────────────────────────────
// Keyword chaining diagnostic
// ─────────────────────────────────────────────────────────

/**
 * Checks keyword chaining for the whole outline.
 *
 * A question violates chaining if it shares no keywords with the answer(s)
 * of the previous sibling question. The first answer under a question
 * violates chaining if it shares no keywords with its parent question.
 * The 2nd+ answers violate chaining if they share no keywords with either
 * the immediately preceding sibling answer OR the parent question.
 */
export function checkKeywordChaining(nodes: OutlineNode[]): { [nodeId: string]: string } {
  const violations: { [nodeId: string]: string } = {};

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.depth <= 1) continue;
    if (node.type !== 'question' && node.type !== 'answer') continue;
    if (!node.text.trim()) continue;

    const partners = getChainingPartners(nodes, i).filter(
      (p) => p.depth >= 2 && p.text.trim()
    );

    if (partners.length === 0) continue; // Nothing to chain against

    const currentKeywords = getKeywords(node.text);
    if (currentKeywords.length === 0) continue;

    // Check if any partner shares at least one keyword
    const hasChain = partners.some((partner) => {
      const partnerKeywords = getKeywords(partner.text);
      return currentKeywords.some((w) => partnerKeywords.includes(w));
    });

    if (!hasChain) {
      if (node.type === 'question') {
        violations[node.id] = `Keyword Chaining Violation: This question does not share any keywords with the ANSWER of the previous question. Add shared keywords for cohesion.`;
      } else {
        violations[node.id] = `Keyword Chaining Violation: This answer does not share any keywords with its parent QUESTION. Add shared keywords for coherence.`;
      }

    }
  }

  return violations;
}

// ─────────────────────────────────────────────────────────
// Keyword color mapping — POS-filtered, scope-restricted
// ─────────────────────────────────────────────────────────

/**
 * Returns a map of word → "bg|fg" color strings for keyword highlights.
 *
 * A word is highlighted on a line only when:
 *   1. It also appears in at least one structurally adjacent line
 *      (the parent node or a same-depth sibling under the same parent).
 *   2. It is used in the same POS category in both lines (e.g., both as a Noun).
 *      This prevents highlighting "review" as Noun in one line and Verb in another.
 */
export function getKeywordColors(nodes: OutlineNode[], isDark: boolean): { [nodeId: string]: { [word: string]: string } } {
  // Build color entries per word — but keyed to lines
  // We'll produce a map of nodeId → word → color, but only for words that
  // pass the scope + POS tests on that specific pair of lines.

  const nodeValidWords = new Map<string, Set<string>>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.depth <= 1) continue;
    if (!node.text.trim()) continue;

    const partners = getChainingPartners(nodes, i).filter(
      (p) => p.depth >= 2 && p.text.trim()
    );
    if (partners.length === 0) continue;

    const nodeKeywords = getKeywords(node.text);
    if (nodeKeywords.length === 0) continue;

    // POS tags for the current node
    const nodePOS = getWordPOSTags(node.text);

    for (const partner of partners) {
      const partnerKeywords = new Set(getKeywords(partner.text));
      const partnerPOS = getWordPOSTags(partner.text);

      for (const word of nodeKeywords) {
        if (!partnerKeywords.has(word)) continue;

        // POS check: both must have an identifiable tag AND be in the same category
        const nodeTag = nodePOS.get(word);
        const partnerTag = partnerPOS.get(word);

        // If both tags are resolved and differ → skip (different grammatical role)
        if (
          nodeTag && partnerTag &&
          nodeTag !== 'Other' && partnerTag !== 'Other' &&
          nodeTag !== partnerTag
        ) {
          continue;
        }

        // This word passes: same structural scope, same (or indeterminate) POS
        if (!nodeValidWords.has(node.id)) {
          nodeValidWords.set(node.id, new Set());
        }
        nodeValidWords.get(node.id)!.add(word);

        if (!nodeValidWords.has(partner.id)) {
          nodeValidWords.set(partner.id, new Set());
        }
        nodeValidWords.get(partner.id)!.add(word);
      }
    }
  }

  // Assign stable HSL colors to each validated word
  const wordColors: { [word: string]: string } = {};
  const getWordColor = (word: string) => {
    if (wordColors[word]) return wordColors[word];
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const sat = 75;
    const light = isDark ? 25 : 88;
    const textLight = isDark ? 90 : 20;
    wordColors[word] = `hsl(${hue}, ${sat}%, ${light}%)|hsl(${hue}, ${sat}%, ${textLight}%)`;
    return wordColors[word];
  };

  const colors: { [nodeId: string]: { [word: string]: string } } = {};
  for (const [nodeId, words] of nodeValidWords.entries()) {
    colors[nodeId] = {};
    for (const word of words) {
      colors[nodeId][word] = getWordColor(word);
    }
  }

  return colors;
}
