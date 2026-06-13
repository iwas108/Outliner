import type { Project } from '../db/indexedDB';
import { getKeywordColors } from './analyzer';

export function getSafeExportFilename(project: Project): string {
  const safeTitle = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 30);

  const rev = project.commits && project.commits.length > 0
    ? `rev-${project.commits.length}`
    : 'original';

  return `${safeTitle || 'outline'}_${rev}`;
}

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
    lineSpacing = 1.3,
    lineHeight = 1.6,
    indentSpacing = 8,
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

  const renderHighlightTextHtml = (text: string, depth: number, nodeId: string) => {
    if (!text) return '';
    const tokens = text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?])/);

    const isHighlightEnabled = depth >= 2 && (levelHighlighting[depth] !== undefined ? levelHighlighting[depth] : includeHighlighting);
    if (!isHighlightEnabled) {
      return escapeHtml(text);
    }

    const nodeKeywordColors = keywordColors[nodeId] || {};

    return tokens.map((token) => {
      const cleanWord = token.toLowerCase();
      if (nodeKeywordColors && nodeKeywordColors[cleanWord]) {
        const [bg, fg] = nodeKeywordColors[cleanWord].split('|');
        return `<span style="background-color: ${bg}; color: ${fg}; padding: 0.5px 2px; border-radius: 1px; font-weight: 500; display: inline; white-space: pre; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${escapeHtml(token)}</span>`;
      }
      return escapeHtml(token);
    }).join('');
  };

  const revisionText = project.commits && project.commits.length > 0
    ? `Revision ${project.commits.length}`
    : 'Original';

  const safeFilename = getSafeExportFilename(project);

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
      .outline-node span {
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
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .title {
      font-size: 26px;
      font-weight: 850;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin: 0 0 16px 0;
      line-height: 1.15;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      font-size: 11px;
      color: #334155;
    }
    .meta-column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .meta-item {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-left: 3px solid #6366f1;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .meta-label {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.05em;
      color: #4f46e5;
      display: block;
      margin-bottom: 4px;
    }
    .meta-value {
      font-size: 11px;
      line-height: 1.45;
      color: #334155;
    }
    .meta-value ol {
      margin: 4px 0 0 0;
      padding-left: 16px;
    }
    .meta-value li {
      margin-bottom: 4px;
      line-height: 1.4;
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
${indentStyles}
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 8mm; /* matches footer-space */
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding: 4px 0 2px 0;
      background: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 8px;
      color: #64748b;
      font-weight: 550;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .footer-space {
      height: 8mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
    }
    .page-footer a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 600;
    }
    /* CSS counter for page numbers inside the fixed footer */
    .page-footer-page::after {
      content: "Page " counter(page) " / " counter(pages);
    }
  `;

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
        ? renderHighlightTextHtml(node.text, node.depth, node.id)
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
    ? `<ol>
        ${metadata.subResearchQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
       </ol>`
    : 'None';



  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(safeFilename)}</title>
      <style>${styles}</style>
      <!-- Local MathJax Configuration & Loader -->
      <script>
        window.printed = false;
        function triggerPrint() {
          if (!window.printed) {
            window.printed = true;
            window.print();
            window.parent.postMessage({ type: 'OUTLINER_PRINT_DONE' }, '*');
          }
        }
        
        window.addEventListener('DOMContentLoaded', () => {
          // Fallback: trigger print after 3 seconds in case MathJax fails to load/typeset
          setTimeout(triggerPrint, 3000);
        });

        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
            processEscapes: true
          },
          options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
          },
          startup: {
            pageReady: () => {
              return MathJax.startup.defaultPageReady().then(() => {
                setTimeout(triggerPrint, 200);
              });
            }
          }
        };
      </script>
      <script id="MathJax-script" async src="mathjax/tex-mml-chtml.js"></script>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${escapeHtml(title)}</h1>
        <div class="meta-grid">
          <div class="meta-column">
            <div class="meta-item">
              <span class="meta-label">Writing Goal</span>
              <div class="meta-value">${escapeHtml(metadata.writingGoal || 'Not specified')}</div>
            </div>
            <div class="meta-item">
              <span class="meta-label">Target Audience</span>
              <div class="meta-value">${escapeHtml(metadata.targetAudience || 'Not specified')}</div>
            </div>
            <div class="meta-item">
              <span class="meta-label">Research Objective</span>
              <div class="meta-value">${escapeHtml(metadata.researchObjective || 'Not specified')}</div>
            </div>
          </div>
          <div class="meta-column">
            <div class="meta-item">
              <span class="meta-label">Main Research Question</span>
              <div class="meta-value">${escapeHtml(metadata.researchQuestion || 'Not specified')}</div>
            </div>
            <div class="meta-item">
              <span class="meta-label">Sub Research Questions</span>
              <div class="meta-value">${srqsHtml}</div>
            </div>
          </div>
        </div>
      </div>
      <table>
        <thead><tr><td></td></tr></thead>
        <tbody>
          <tr>
            <td>
              <div class="outline-container">
                ${nodesHtml}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <div class="footer-space">&nbsp;</div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="page-footer">
        <a href="https://iwas108.github.io/Outliner" target="_blank" rel="noopener">Made with Outliner (https://iwas108.github.io/Outliner) &#8599;</a>
        <span>${escapeHtml(revisionText)}</span>
        <span class="page-footer-page"></span>
      </div>

    </body>
    </html>
  `;

  // Temporarily change host title to force safe PDF download filename in browser
  const originalHostTitle = document.title;
  document.title = safeFilename;

  // Listen to postMessage from the iframe when printing is done
  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'OUTLINER_PRINT_DONE') {
      cleanup();
    }
  };
  window.addEventListener('message', handleMessage);

  const cleanup = () => {
    window.removeEventListener('message', handleMessage);
    document.title = originalHostTitle;
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  // Safe fallback cleanup after 12 seconds in case printing is slow or cancelled
  setTimeout(cleanup, 12000);

  doc.open();
  doc.write(htmlContent);
  doc.close();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
