import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageOrientation,
  LineRuleType,
  Footer,
  PageNumber,
  ExternalHyperlink,
  AlignmentType,
} from 'docx';
import type { Project } from '../db/indexedDB';
import { getKeywordColors } from './analyzer';
import { getSafeExportFilename } from './pdfPrinter';

// Page size constants in twips (1 inch = 1440 twips, 1 mm = 56.6929 twips)
const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 },
  A5: { width: 8390, height: 11906 },
  Legal: { width: 12240, height: 20160 },
};

function parseHsl(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3]),
    };
  }
  return { h: 0, s: 0, l: 0 };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function convertHslStrToHex(hslStr: string): { bg: string; fg: string } {
  const [bgHsl, fgHsl] = hslStr.split('|');
  const bgParsed = parseHsl(bgHsl);
  const fgParsed = parseHsl(fgHsl);
  return {
    bg: hslToHex(bgParsed.h, bgParsed.s, bgParsed.l),
    fg: hslToHex(fgParsed.h, fgParsed.s, fgParsed.l),
  };
}

export async function exportOutlineToDocx(project: Project): Promise<void> {
  const { title, metadata, nodes } = project;
  const {
    pageSize = 'A4',
    orientation = 'portrait',
    margins = { top: 10, bottom: 20, left: 20, right: 20 },
    includeHighlighting = false,
    lineSpacing = 1.5,
    indentSpacing = 10,
    levelHighlighting = {},
    levelLineSpacing = {},
    levelIndentSpacing = {}
  } = metadata;

  // 1. Calculate Page Size
  let pageSizeInfo = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  let pageSetupWidth = pageSizeInfo.width;
  let pageSetupHeight = pageSizeInfo.height;
  if (orientation === 'landscape') {
    pageSetupWidth = pageSizeInfo.height;
    pageSetupHeight = pageSizeInfo.width;
  }

  // 2. Calculate Margins
  const topMargin = Math.round(margins.top * 56.6929);
  const bottomMargin = Math.round(margins.bottom * 56.6929);
  const leftMargin = Math.round(margins.left * 56.6929);
  const rightMargin = Math.round(margins.right * 56.6929);

  // 3. Keywords highlight colors
  const keywordColors = getKeywordColors(nodes, false);

  // Helper to construct tokenized text runs for a node
  const buildTextRuns = (text: string, depth: number, nodeId: string, defaultColor: string, defaultSize: number, defaultBold: boolean): TextRun[] => {
    if (!text) {
      return [new TextRun({ text: '(Empty Line)', italics: true, color: '94A3B8', font: 'Arial', size: defaultSize })];
    }

    const isHighlightEnabled = depth >= 2 && (levelHighlighting[depth] !== undefined ? levelHighlighting[depth] : includeHighlighting);
    if (!isHighlightEnabled) {
      return [new TextRun({ text, color: defaultColor, font: 'Arial', size: defaultSize, bold: defaultBold })];
    }

    const nodeKeywordColors = keywordColors[nodeId] || {};
    const tokens = text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?])/);

    return tokens.map((token) => {
      const cleanWord = token.toLowerCase();
      if (nodeKeywordColors && nodeKeywordColors[cleanWord]) {
        const hexColors = convertHslStrToHex(nodeKeywordColors[cleanWord]);
        return new TextRun({
          text: token,
          shading: {
            fill: hexColors.bg,
          },
          color: hexColors.fg,
          bold: true,
          font: 'Arial',
          size: defaultSize,
        });
      }
      return new TextRun({
        text: token,
        color: defaultColor,
        font: 'Arial',
        size: defaultSize,
        bold: defaultBold,
      });
    });
  };

  // 4. Construct Header Block (Stylized Table)
  const cellPadding = { top: 140, bottom: 140, left: 170, right: 170 }; // DXA (1 pt = 20 dxa)
  const cellBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.SINGLE, size: 24, color: '6366F1' }, // 3pt thickness
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };
  const cellShading = { fill: 'F8FAFC' };

  const leftColumnChildren = [
    new Paragraph({
      children: [new TextRun({ text: 'WRITING GOAL', bold: true, size: 17, color: '4F46E5', font: 'Arial' })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: metadata.writingGoal || 'Not specified', size: 22, color: '334155', font: 'Arial' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'TARGET AUDIENCE', bold: true, size: 17, color: '4F46E5', font: 'Arial' })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: metadata.targetAudience || 'Not specified', size: 22, color: '334155', font: 'Arial' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'RESEARCH OBJECTIVE', bold: true, size: 17, color: '4F46E5', font: 'Arial' })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: metadata.researchObjective || 'Not specified', size: 22, color: '334155', font: 'Arial' })],
      spacing: { after: 0 },
    }),
  ];

  const rightColumnChildren = [
    new Paragraph({
      children: [new TextRun({ text: 'MAIN RESEARCH QUESTION', bold: true, size: 17, color: '4F46E5', font: 'Arial' })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: metadata.researchQuestion || 'Not specified', size: 22, color: '334155', font: 'Arial' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'SUB RESEARCH QUESTIONS', bold: true, size: 17, color: '4F46E5', font: 'Arial' })],
      spacing: { after: 60 },
    }),
    ...(metadata.subResearchQuestions && metadata.subResearchQuestions.length > 0
      ? metadata.subResearchQuestions.map((q, idx) =>
          new Paragraph({
            children: [new TextRun({ text: `${idx + 1}. ${q}`, size: 22, color: '334155', font: 'Arial' })],
            spacing: { after: 60 },
          })
        )
      : [
          new Paragraph({
            children: [new TextRun({ text: 'None', size: 22, color: '64748B', font: 'Arial', italics: true })],
          }),
        ]),
  ];

  const metadataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading: cellShading,
            margins: cellPadding,
            children: leftColumnChildren,
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            children: [],
          }),
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading: cellShading,
            margins: cellPadding,
            children: rightColumnChildren,
          }),
        ],
      }),
    ],
  });

  // 5. Build Document Elements List
  const docElements: any[] = [];

  // Title
  docElements.push(
    new Paragraph({
      children: [new TextRun({ text: title || 'Untitled Outline', bold: true, size: 52, color: '0F172A', font: 'Arial' })],
      spacing: { after: 360 },
    })
  );

  // Metadata Table
  docElements.push(metadataTable);

  // Space after metadata table
  docElements.push(
    new Paragraph({
      spacing: { before: 400 },
    })
  );

  // 6. Translate Outline Nodes
  nodes.forEach((node) => {
    // Indent calculations
    const indentMm = levelIndentSpacing[node.depth] !== undefined ? levelIndentSpacing[node.depth] : node.depth * indentSpacing;
    const indentTwips = Math.round(indentMm * 56.6929);

    // Line spacing & bottom spacing calculations
    const customLineSpacing = levelLineSpacing[node.depth] !== undefined ? levelLineSpacing[node.depth] : lineSpacing;

    const lineRuleVal = Math.round(customLineSpacing * 240);
    const afterSpacingVal = Math.round(customLineSpacing * 2 * 56.6929); // margin-bottom mapping

    // Styling defaults based on Node type
    let size = 24; // 12pt default
    let bold = false;
    let color = '475569';
    let beforeSpacing = 0;
    let afterSpacing = afterSpacingVal;
    const prefixRuns: TextRun[] = [];

    if (node.type === 'section') {
      size = 32; // 16pt
      bold = true;
      color = '0F172A';
      beforeSpacing = 360;
      afterSpacing = 120;
    } else if (node.type === 'topic') {
      size = 28; // 14pt
      bold = true;
      color = '1E293B';
      beforeSpacing = 200;
      afterSpacing = 80;
    } else if (node.type === 'question') {
      size = 24; // 12pt
      bold = true;
      color = '334155';
      prefixRuns.push(new TextRun({ text: 'Q: ', bold: true, color: '6366F1', font: 'Arial', size: 24 }));
    } else if (node.type === 'answer') {
      size = 24; // 12pt
      color = '475569';
      prefixRuns.push(new TextRun({ text: 'A: ', bold: true, color: '64748B', font: 'Arial', size: 24 }));
    }

    const contentRuns = buildTextRuns(node.text, node.depth, node.id, color, size, bold);

    docElements.push(
      new Paragraph({
        children: [...prefixRuns, ...contentRuns],
        indent: { left: indentTwips },
        spacing: {
          line: lineRuleVal,
          lineRule: LineRuleType.AUTO,
          before: beforeSpacing,
          after: afterSpacing,
        },
      })
    );
  });

  // 7. Create Footer
  const revisionText = project.commits && project.commits.length > 0
    ? `Revision ${project.commits.length}`
    : 'Original';

  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            margins: { top: 120, bottom: 120, left: 0, right: 0 },
            children: [
              new Paragraph({
                children: [
                  new ExternalHyperlink({
                    children: [
                      new TextRun({
                        text: 'Made with Outliner (https://iwas108.github.io/Outliner) ↗',
                        size: 16, // 8pt
                        color: '6366F1',
                        font: 'Arial',
                      }),
                    ],
                    link: 'https://iwas108.github.io/Outliner',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            margins: { top: 120, bottom: 120, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: revisionText,
                    size: 16, // 8pt
                    color: '64748B',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            margins: { top: 120, bottom: 120, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: '64748B',
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '64748B',
                    font: 'Arial',
                  }),
                  new TextRun({
                    text: ' / ',
                    size: 16,
                    color: '64748B',
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '64748B',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 8. Create Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageSetupWidth,
              height: pageSetupHeight,
              orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: topMargin,
              bottom: bottomMargin,
              left: leftMargin,
              right: rightMargin,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [footerTable],
          }),
        },
        children: docElements,
      },
    ],
  });

  // 9. Generate and download
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${getSafeExportFilename(project)}.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
