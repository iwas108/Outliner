import type { OutlineNode } from '../db/indexedDB';

/**
 * Validates whether a node at the specified index can be indented.
 * 
 * Rules for indentation:
 * 1. Current depth must be less than 5 (maximum level is 6, index 0 to 5).
 * 2. Node cannot be the first node (index 0).
 * 3. The node immediately above it must have a depth >= current node's depth.
 *    (You can only indent if you are subordinate to the node above).
 * 4. Structural pairing constraints:
 *    - Indenting to depth 1 (Topic): Parent must be a Section (depth 0).
 *    - Indenting to depth 2 (Question): Parent must be a Topic (depth 1).
 *    - Indenting to depth 3 (Answer): Parent must be a Question (depth 2).
 *    - Indenting to depth 4 (Question): Parent must be an Answer (depth 3).
 *    - Indenting to depth 5 (Answer): Parent must be a Question (depth 4).
 */
export function canIndent(nodes: OutlineNode[], index: number, maxDepth: number = 11): boolean {
  if (index <= 0 || index >= nodes.length) return false;
  
  const currentNode = nodes[index];
  if (currentNode.depth >= maxDepth) return false;

  const previousNode = nodes[index - 1];
  
  // Can only indent if the previous node's depth is greater than or equal to current depth
  if (previousNode.depth < currentNode.depth) return false;

  // Predict new depth
  const targetDepth = currentNode.depth + 1;
  const targetType = getNodeTypeForDepth(targetDepth);

  // Validate the type transition matches structural rules
  if (targetType === 'topic' && previousNode.type !== 'section' && previousNode.depth !== 0) {
    // If we indent to topic, there must be a section above it
    const parentSection = findParent(nodes, index, 0);
    if (!parentSection || parentSection.type !== 'section') return false;
  }

  return true;
}

/**
 * Validates whether a node at the specified index can be outdented.
 * 
 * Rules for outdent:
 * 1. Current depth must be > 0.
 * 2. Cannot outdent if it would violate parent-child relationships for subsequent nodes.
 */
export function canOutdent(nodes: OutlineNode[], index: number): boolean {
  if (index < 0 || index >= nodes.length) return false;
  const currentNode = nodes[index];
  return currentNode.depth > 0;
}

/**
 * Gets the mandatory node type based on its indent depth.
 * 
 * Depth Mapping:
 * - 0: Section
 * - 1: Topic
 * - 2: Question
 * - 3: Answer
 * - 4: Question
 * - 5: Answer
 */
export function getNodeTypeForDepth(depth: number): 'section' | 'topic' | 'question' | 'answer' {
  switch (depth) {
    case 0:
      return 'section';
    case 1:
      return 'topic';
    default:
      return depth % 2 === 0 ? 'question' : 'answer';
  }
}

/**
 * Finds the parent node of a line in the outline tree.
 * The parent is the nearest preceding node with depth = targetDepth.
 */
export function findParent(nodes: OutlineNode[], index: number, targetDepth: number): OutlineNode | null {
  for (let i = index - 1; i >= 0; i--) {
    if (nodes[i].depth === targetDepth) {
      return nodes[i];
    }
    if (nodes[i].depth < targetDepth) {
      // Crossed boundary
      break;
    }
  }
  return null;
}

/**
 * Evaluates whether adding a node of a specific type is structurally valid at the given context.
 */
export function canAddNode(
  nodes: OutlineNode[],
  type: 'section' | 'topic' | 'question' | 'answer'
): boolean {
  if (nodes.length === 0) {
    // First node must be a section
    return type === 'section';
  }

  const lastNode = nodes[nodes.length - 1];

  if (type === 'section') return true;

  if (type === 'topic') {
    // Topic requires a section to exist
    return nodes.some((n) => n.type === 'section');
  }

  // Question/Answer requires section and topic to exist
  const hasSection = nodes.some((n) => n.type === 'section');
  const hasTopic = nodes.some((n) => n.type === 'topic');
  if (!hasSection || !hasTopic) return false;

  if (type === 'question') {
    // Question can be added after a topic or after an answer
    return lastNode.type === 'topic' || lastNode.type === 'answer' || lastNode.type === 'question';
  }

  if (type === 'answer') {
    // Answer must succeed a question or another answer
    return lastNode.type === 'question' || lastNode.type === 'answer';
  }

  return false;
}

/**
 * Validates the entire outline tree for structural violations.
 * Returns an array of error messages with node indexes.
 */
export interface ValidationError {
  index: number;
  nodeId: string;
  message: string;
}

export function validateOutlineTree(nodes: OutlineNode[], maxDepth: number = 11): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // 1. First node must be a section
    if (i === 0 && node.type !== 'section') {
      errors.push({
        index: i,
        nodeId: node.id,
        message: 'The outline must start with a Section.',
      });
      continue;
    }

    // 2. Depth matches required type
    const expectedType = getNodeTypeForDepth(node.depth);
    if (node.type !== expectedType) {
      errors.push({
        index: i,
        nodeId: node.id,
        message: `Line depth ${node.depth} expects a ${expectedType.toUpperCase()} node, but found a ${node.type.toUpperCase()} node.`,
      });
    }

    // 3. Question must have an answer child at depth + 1
    if (node.type === 'question') {
      let hasAnswer = false;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].depth <= node.depth) {
          // No longer a child level
          break;
        }
        if (nodes[j].depth === node.depth + 1 && nodes[j].type === 'answer') {
          hasAnswer = true;
          break;
        }
      }
      if (!hasAnswer && node.depth < maxDepth) {
        errors.push({
          index: i,
          nodeId: node.id,
          message: `Question "${node.text.slice(0, 30)}..." must have at least one Answer indented below it.`,
        });
      }
    }

    // 4. Answer must have a question parent
    if (node.type === 'answer' && node.depth > 0) {
      const parent = findParent(nodes, i, node.depth - 1);
      if (!parent || parent.type !== 'question') {
        errors.push({
          index: i,
          nodeId: node.id,
          message: `Answer "${node.text.slice(0, 30)}..." is missing a parent Question.`,
        });
      }
    }
    
    // 5. Topic must have a section parent
    if (node.type === 'topic' && node.depth > 0) {
      const parent = findParent(nodes, i, node.depth - 1);
      if (!parent || parent.type !== 'section') {
        errors.push({
          index: i,
          nodeId: node.id,
          message: `Topic "${node.text.slice(0, 30)}..." is missing a parent Section.`,
        });
      }
    }
  }

  return errors;
}
