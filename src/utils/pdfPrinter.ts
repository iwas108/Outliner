import type { Project } from '../db/indexedDB';
import { getKeywordColors } from './analyzer';

export function printOutline(project: Project): void {
  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Failed to access print iframe document');
    return;
  }

  const { title, metadata, nodes } = project;
  const { 
    pageSize = 'A4', 
    orientation = 'portrait', 
    margins = { top: 20, bottom: 20, left: 20, right: 20 },
    maxLevel = 12,
    includeHighlighting = false,
    lineSpacing = 1.5,
    lineHeight = 1.4,
    indentSpacing = 10,
    levelHighlighting = {},
    levelLineSpacing = {},
    levelLineHeight = {},
    levelIndentSpacing = {}
  } = metadata;

  // Generate dynamic indentation and line spacing levels spacing stylesheet
  let indentStyles = '';
  let lineSpacingStyles = '';
  for (let d = 0; d <= (maxLevel || 20); d++) {
    const customIndent = levelIndentSpacing[d] !== undefined ? levelIndentSpacing[d] : (d * indentSpacing);
    indentStyles += `    .depth-${d} { margin-left: ${customIndent}mm; }\n`;
    
    const customLineSpacing = levelLineSpacing[d] !== undefined ? levelLineSpacing[d] : lineSpacing;
    const customLineHeight = levelLineHeight[d] !== undefined ? levelLineHeight[d] : lineHeight;
    lineSpacingStyles += `    .line-spacing-${d} { margin-bottom: ${customLineSpacing * 2}mm; line-height: ${customLineHeight}; }\n`;
  }

  // Calculate repeat keywords colors (light background mode for printing)
  const keywordColors = getKeywordColors(nodes, false);

  const renderHighlightTextHtml = (text: string, depth: number) => {
    if (!text) return '';
    const tokens = text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?])/);
    
    const isHighlightEnabled = depth >= 2 && (levelHighlighting[depth] !== undefined ? levelHighlighting[depth] : includeHighlighting);
    if (!isHighlightEnabled) {
      return escapeHtml(text);
    }

    return tokens.map((token) => {
      const cleanWord = token.toLowerCase();
      if (keywordColors && keywordColors[cleanWord]) {
        const [bg, fg] = keywordColors[cleanWord].split('|');
        return `<span style="background-color: ${bg}; color: ${fg}; padding: 1px 3px; border-radius: 2px; font-weight: 500; display: inline-block; white-space: pre;">${escapeHtml(token)}</span>`;
      }
      return escapeHtml(token);
    }).join('');
  };

  // Build the print styles
  const styles = `
    @page {
      size: ${pageSize} ${orientation};
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
    @media print {
      body {
        background: #fff;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: ${lineSpacing};
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      font-size: 11px;
      color: #475569;
    }
    .meta-item {
      margin-bottom: 6px;
    }
    .meta-label {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .outline-container {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .outline-node {
      page-break-inside: avoid;
      font-size: 13px;
    }
    .node-section {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 18px;
      margin-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
    }
    .node-topic {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .node-question {
      font-weight: 600;
      color: #334155;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .node-answer {
      font-weight: 400;
      color: #475569;
      margin-top: 2px;
      margin-bottom: 2px;
    }
${lineSpacingStyles}
${indentStyles}  `;

  // Format nodes as HTML
  const nodesHtml = nodes
    .map((node) => {
      let classType = 'node-answer';
      let prefix = '';
      if (node.type === 'section') classType = 'node-section';
      else if (node.type === 'topic') classType = 'node-topic';
      else if (node.type === 'question') {
        classType = 'node-question';
        prefix = '<span style="color: #6366f1; font-weight: 700; margin-right: 4px;">Q:</span>';
      } else if (node.type === 'answer') {
        classType = 'node-answer';
        prefix = '<span style="color: #64748b; font-weight: 700; margin-right: 4px;">A:</span>';
      }

      const contentHtml = node.text
        ? renderHighlightTextHtml(node.text, node.depth)
        : escapeHtml('(Empty Line)');

      return `
        <div class="outline-node ${classType} depth-${node.depth} line-spacing-${node.depth}">
          ${prefix}${contentHtml}
        </div>
      `;
    })
    .join('');

  // Format SRQs if present
  const srqsHtml = metadata.subResearchQuestions && metadata.subResearchQuestions.length > 0
    ? `<ol style="margin: 0; padding-left: 16px;">
        ${metadata.subResearchQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
       </ol>`
    : 'None';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${escapeHtml(title)}</h1>
        <div class="meta-grid">
          <div>
            <div class="meta-item">
              <span class="meta-label">Writing Goal</span>
              ${escapeHtml(metadata.writingGoal || 'Not specified')}
            </div>
            <div class="meta-item">
              <span class="meta-label">Target Audience</span>
              ${escapeHtml(metadata.targetAudience || 'Not specified')}
            </div>
            <div class="meta-item">
              <span class="meta-label">Research Objective</span>
              ${escapeHtml(metadata.researchObjective || 'Not specified')}
            </div>
          </div>
          <div>
            <div class="meta-item">
              <span class="meta-label">Main Research Question</span>
              ${escapeHtml(metadata.researchQuestion || 'Not specified')}
            </div>
            <div class="meta-item">
              <span class="meta-label">Sub Research Questions</span>
              ${srqsHtml}
            </div>
          </div>
        </div>
      </div>
      <div class="outline-container">
        ${nodesHtml}
      </div>
    </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for styles/resources to resolve and print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Print dialogue error:', err);
    }
    
    // Remove element after dialog handles print
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
