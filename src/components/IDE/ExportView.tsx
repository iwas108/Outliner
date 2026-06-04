import React, { useState } from 'react';
import type { Project, ProjectMetadata } from '../../db/indexedDB';
import { printOutline, getSafeExportFilename } from '../../utils/pdfPrinter';
import { 
  Printer, 
  FileText, 
  Copy, 
  Check, 
  FileDown, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Settings, 
  Layout, 
  Eye, 
  AlertCircle 
} from 'lucide-react';
import { getKeywordColors } from '../../utils/analyzer';

interface ExportViewProps {
  project: Project;
  onSaveProject: (updatedProject: Project) => void;
}

type PreviewTab = 'preview' | 'prompt';

export const ExportView: React.FC<ExportViewProps> = ({ project, onSaveProject }) => {
  const [previewTab, setPreviewTab] = useState<PreviewTab>('preview');
  const [copied, setCopied] = useState(false);
  const [showPerLevel, setShowPerLevel] = useState(false);
  
  // Destructure config details
  const { title, metadata } = project;
  
  const { 
    pageSize = 'A4', 
    orientation = 'portrait', 
    margins = { top: 20, bottom: 20, left: 20, right: 20 },
    includeHighlighting = false,
    lineSpacing = 1.5,
    lineHeight = 1.4,
    indentSpacing = 10,
    levelHighlighting = {},
    levelLineSpacing = {},
    levelLineHeight = {},
    levelIndentSpacing = {}
  } = metadata;

  // Render highlighted text inside mockup page
  const renderMockupHighlight = (text: string, depth: number) => {
    if (!text) return '';
    const tokens = text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?])/);
    const keywordColors = getKeywordColors(project.nodes, false); // Always light mode colors for mockup sheet

    // Check if highlights are enabled for this specific level and depth >= 2
    const isHighlightEnabled = depth >= 2 && (levelHighlighting[depth] !== undefined ? levelHighlighting[depth] : includeHighlighting);
    if (!isHighlightEnabled) {
      return text;
    }

    return tokens.map((token, idx) => {
      const cleanWord = token.toLowerCase();
      if (keywordColors && keywordColors[cleanWord]) {
        const [bg, fg] = keywordColors[cleanWord].split('|');
        return (
          <span
            key={idx}
            style={{ backgroundColor: bg, color: fg }}
            className="inline-block px-[2px] py-0 rounded-[1px] font-semibold text-[8px] mx-px"
          >
            {token}
          </span>
        );
      }
      return <span key={idx}>{token}</span>;
    });
  };

  // Sync update changes back to parents
  const updateMetadataField = (key: keyof ProjectMetadata, value: any) => {
    const updatedProject: Project = {
      ...project,
      metadata: {
        ...project.metadata,
        [key]: value
      },
      updatedAt: new Date().toISOString()
    };
    onSaveProject(updatedProject);
  };

  const updateMargin = (side: keyof typeof margins, value: number) => {
    const updatedMargins = {
      ...margins,
      [side]: Math.max(0, value)
    };
    updateMetadataField('margins', updatedMargins);
  };

  const updateLevelHighlight = (level: number, enabled: boolean) => {
    const current = levelHighlighting || {};
    updateMetadataField('levelHighlighting', {
      ...current,
      [level]: enabled
    });
  };

  const updateLevelLineSpacing = (level: number, val: number) => {
    const current = levelLineSpacing || {};
    updateMetadataField('levelLineSpacing', {
      ...current,
      [level]: val
    });
  };

  const updateLevelLineHeight = (level: number, val: number) => {
    const current = levelLineHeight || {};
    updateMetadataField('levelLineHeight', {
      ...current,
      [level]: val
    });
  };

  const updateLevelIndentSpacing = (level: number, val: number) => {
    const current = levelIndentSpacing || {};
    updateMetadataField('levelIndentSpacing', {
      ...current,
      [level]: val
    });
  };

  // Compile LLM Review Prompt
  const generatePromptText = () => {
    return `You are an expert academic writing assistant and outline evaluator.
Please review the research outline metadata below, and the hierarchical node structure provided in the attached \`.json\` file. Your task is to analyze logical continuity, verify question-answer pairings, identify keyword chaining gaps, and check that questions are properly phrased using 5W1H (Who, What, Where, When, Why, How) with a question mark. 

Furthermore, you must evaluate the outline's overarching idea flow, ensuring strict macro and micro cohesion and coherence across all nodes. Assess the research-related substantial flow to verify that the narrative logically progresses from the problem definition through the sequential semantic validation methodology. You must ensure this progression is maintained without introducing conceptual regression, circular reasoning, or disjointed transitions.

### Project Context
- **Title**: SLR Magic - Multi Persona SLR Screening Tools
- **Goal**: To present, architect, and empirically validate an open-source, resource-optimized, multi-persona LLM pipeline architecture (SLR Magic) capable of automating systematic literature reviews while maintaining strict, mathematically verified inter-rater reliability with human experts.
- **Target Audience**: Software engineers, computer scientists, applied AI researchers, and empirical methodologists seeking to implement or evaluate high-throughput agentic workflows for dense scientific text extraction without compromising on statistical reproducibility or structural schema adherence.
- **Research Objective**: The central aim of this research is to present, architect, and empirically validate an open-source, resource-optimized, multi-persona Large Language Model (LLM) pipeline architecture—named SLR Magic—to automate and accelerate the systematic literature review screening process. To resolve the systemic crisis of human cognitive fatigue, high error rates, and prolonged publication timelines inherent in traditional manual reviews, this research pursues a dual-pronged objective: Mechanistically: To validate that the distributed, multi-persona AI pipeline can compress the dense scientific text screening timeline from months to days. It aims to achieve architectural efficiency by successfully mitigating context-window limitations and minimizing processing latency without triggering system timeouts. Methodologically: To introduce and implement a dynamic Sequential Quality Control Audit that minimizes human expert intervention to the absolute theoretical minimum required for statistical validation. This process is designed to prevent human resource exhaustion while mathematically maintaining strict, auditable, and defense-ready inter-rater reliability (Precision, Recall, and Kappa scores) comparable to a blinded panel of domain experts.
- **Main Research Question (MRQ)**: To what extent can a resource-optimized, distributed multi-persona LLM framework achieve architectural efficiency (mitigating processing latency and token context limits) and inter-rater reliability comparable to a blinded panel of domain experts during the systematic screening of highly heterogeneous, multi-disciplinary scientific literature?
- **Sub-Questions (SRQs)**:
  1. Architectural Efficiency: How must a distributed multi-persona LLM framework be structured to mitigate context-window limitations and minimize processing latency during large-scale full-text semantic extraction?
  2. Methodological Reliability: What is the level of statistical agreement (Precision, Recall, and Kappa scores) between the autonomous AI screening decisions and the blinded human expert panel when processing high-heterogeneity literature?

### Outline Structure
The full hierarchical node structure will be provided in the attached \`.json\` file. Each node in the attached dataset contains a unique ID, indent depth, type, and text content. 

*Example Structure (for reference only):*
[ID: e50ae02b-7d44-4d28-a0ce-bceb3fd7abe7] [Depth: 0] [Type: SECTION] Research Methodology
[ID: a24210f3-efcb-4e9b-b80e-0696d54121e6] [Depth: 1] [Type: TOPIC]   Pipeline Macro-Topology Design Of Systematic Review
[ID: c9ee2c2a-9811-48f1-9cb4-a8383cc4458f] [Depth: 2] [Type: QUESTION]     What core operational limitations in traditional systematic reviews necessitate the development of an automated screening strategy?
[ID: 51ffba94-e481-48ad-ace9-d1adce79ee6f] [Depth: 3] [Type: ANSWER]       Traditional systematic reviews require human experts to manually vet thousands of academic citations...

**Please analyze the specific node data provided in the attached file.**

### Review Output Instructions
Analyze each node/line from the attached file and output a JSON array of specific inline critiques. You MUST respond ONLY with a valid JSON object matching the following structure:
{
  "comments": [
    {
      "lineId": "string",      // Must exactly match the node's UUID from the attached file
      "commentText": "string"  // Direct, constructive academic critique assessing 5W1H phrasing, keyword chaining, structural progression, logical cohesion, and flow regressions.
    }
  ]
}

CRITICAL RULES:
1. Provide highly actionable academic feedback (identifying logical gaps, phrasing issues, structure violations, missing proof paths, flow regressions, or cohesion breaks).
2. Ensure you evaluate the logic strictly based on sequential semantic validation architecture, rather than defaulting to simple keyword-matching evaluations.
3. Return ONLY the raw JSON object. Do not include markdown code fence formatting (like \`\`\`json) or conversational text. Start directly with { and end with }.`;
  };

  const handleCopyPrompt = () => {
    const text = generatePromptText();
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy clipboard prompt:', err);
      });
  };

  const handleDownloadOtln = () => {
    // Generate clean .json outline file
    const otlnData = {
      metadata: {
        writingGoal: metadata.writingGoal,
        targetAudience: metadata.targetAudience,
        researchObjective: metadata.researchObjective,
        researchQuestion: metadata.researchQuestion,
        subResearchQuestions: metadata.subResearchQuestions
      },
      nodes: project.nodes.map(({ id, type, text, depth }) => ({ id, type, text, depth }))
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(otlnData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${getSafeExportFilename(project)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadBackup = () => {
    // Generate .otln-project file containing all histories
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(project, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${getSafeExportFilename(project)}.otln-project`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Convert mm to screen representation pixels (scaling factor)
  const mmToPx = 1.35; // Visual scale factor
  const pageRatio = orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]';
  
  // Custom sizing styles mapping
  let pageMaxWidth = 'max-w-[700px]';
  if (pageSize === 'A5') pageMaxWidth = 'max-w-[500px]';
  if (pageSize === 'Legal') pageMaxWidth = 'max-w-[750px]';

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch animate-fadeIn">
      
      {/* Left Pane: Visual Previews */}
      <div className="flex-grow flex flex-col gap-4 min-w-0">
        
        {/* Toggle subtabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setPreviewTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              previewTab === 'preview'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            Document PDF Preview
          </button>
          <button
            onClick={() => setPreviewTab('prompt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              previewTab === 'prompt'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            LLM Review Prompt
          </button>
        </div>

        {/* Dynamic Display Area */}
        <div className="flex-grow glass rounded-2xl border border-slate-200 dark:border-slate-850 p-6 flex items-start justify-center bg-slate-100/50 dark:bg-slate-950/20 overflow-y-auto max-h-[75vh] min-h-[500px]">
          
          {previewTab === 'preview' ? (
            /* PDF Visual Mockup Card */
            <div 
              className={`w-full ${pageMaxWidth} ${pageRatio} bg-white text-slate-800 shadow-xl border border-slate-200/60 transition-all duration-300 flex flex-col`}
              style={{
                paddingTop: `${margins.top * mmToPx}px`,
                paddingBottom: `${margins.bottom * mmToPx}px`,
                paddingLeft: `${margins.left * mmToPx}px`,
                paddingRight: `${margins.right * mmToPx}px`,
              }}
            >
              {/* Paper Content Wrapper */}
              <div className="flex-grow flex flex-col gap-4 text-[10px] overflow-hidden">
                <header className="border-b border-slate-200 pb-2 flex flex-col gap-1">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title || 'Untitled Outline'}</h2>
                  <div className="grid grid-cols-2 gap-2 text-[8px] text-slate-500">
                    <div>
                      <span className="font-bold text-[7px] text-slate-400 block uppercase">Goal</span>
                      <p className="truncate">{metadata.writingGoal || 'Not formulated'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-[7px] text-slate-400 block uppercase">Objective</span>
                      <p className="truncate">{metadata.researchObjective || 'Not formulated'}</p>
                    </div>
                  </div>
                </header>

                {/* Outline Nodes */}
                <div 
                  className="flex flex-col gap-0 overflow-y-auto max-h-full pr-1"
                >
                  {project.nodes.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 italic">
                      No nodes added to the outline yet.
                    </div>
                  ) : (
                    project.nodes.map((node) => {
                      let nodeStyle = 'font-normal text-slate-650';
                      let prefix = '';
                      if (node.type === 'section') {
                        nodeStyle = 'font-black text-slate-900 border-b border-slate-100 pb-0.5 mt-2';
                      } else if (node.type === 'topic') {
                        nodeStyle = 'font-bold text-slate-800 mt-1';
                      } else if (node.type === 'question') {
                        nodeStyle = 'font-semibold text-slate-850';
                        prefix = 'Q: ';
                      } else if (node.type === 'answer') {
                        nodeStyle = 'font-normal text-slate-600';
                        prefix = 'A: ';
                      }

                      const customLineSpacing = levelLineSpacing[node.depth] !== undefined 
                        ? levelLineSpacing[node.depth] 
                        : lineSpacing;
                      const customLineHeight = levelLineHeight[node.depth] !== undefined
                        ? levelLineHeight[node.depth]
                        : lineHeight;
                      const customIndent = levelIndentSpacing[node.depth] !== undefined
                        ? levelIndentSpacing[node.depth]
                        : (node.depth * indentSpacing);
                      const isHighlightEnabled = levelHighlighting[node.depth] !== undefined
                        ? levelHighlighting[node.depth]
                        : includeHighlighting;

                      return (
                        <div 
                          key={node.id} 
                          className={`${nodeStyle}`}
                          style={{
                            marginLeft: `${customIndent * mmToPx}px`,
                            lineHeight: customLineHeight,
                            marginBottom: `${customLineSpacing * 2 * mmToPx}px`,
                          }}
                        >
                          <span className="text-[9px] font-bold text-slate-400/80 mr-0.5">{prefix}</span>
                          {node.text ? (
                            isHighlightEnabled 
                              ? renderMockupHighlight(node.text, node.depth) 
                              : node.text
                          ) : (
                            <span className="text-slate-300 italic">(Empty Line)</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* LLM Prompter view */
            <div className="w-full max-w-2xl flex flex-col gap-3 h-full">
              <div className="flex justify-between items-center bg-slate-200/60 dark:bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Copiable LLM Review Instructions</span>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied Prompt!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>
              <pre className="flex-grow p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 text-[11px] overflow-auto max-h-[500px] whitespace-pre-wrap font-mono select-all selection:bg-purple-900 selection:text-white">
                {generatePromptText()}
              </pre>
            </div>
          )}

        </div>
      </div>

      {/* Right Pane: Settings & Download Actions Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
        
        {/* Layout & Print Config Card */}
        <div className="glass rounded-2xl p-5 border border-slate-200 dark:border-slate-850 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Layout className="w-4 h-4 text-purple-500" />
            PDF Format Settings
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Paper Size</label>
            <select
              value={pageSize}
              onChange={(e) => updateMetadataField('pageSize', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="A4">A4 (210 x 297mm)</option>
              <option value="Letter">Letter (8.5 x 11in)</option>
              <option value="A5">A5 (148 x 210mm)</option>
              <option value="Legal">Legal (8.5 x 14in)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              {(['portrait', 'landscape'] as const).map((orient) => (
                <button
                  key={orient}
                  onClick={() => updateMetadataField('orientation', orient)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                    orientation === orient
                      ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  {orient}
                </button>
              ))}
            </div>
          </div>

          {/* Margins Sliders */}
          <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Margins (mm)</label>
            <div className="flex flex-col gap-2.5">
              {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                <div key={side} className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 capitalize w-12">{side}</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={margins[side]}
                    onChange={(e) => updateMargin(side, parseInt(e.target.value) || 0)}
                    className="flex-grow accent-purple-600 h-1 rounded bg-slate-200 dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={margins[side]}
                    onChange={(e) => updateMargin(side, parseInt(e.target.value) || 0)}
                    className="w-12 px-1.5 py-1 text-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Layout Formatting & Spacings */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Include Highlights</span>
                <span className="text-[9px] text-slate-400">Render keyword color tags</span>
              </div>
              <input
                type="checkbox"
                checked={includeHighlighting}
                onChange={(e) => updateMetadataField('includeHighlighting', e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 border-slate-350 focus:ring-purple-500 accent-purple-600 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>Line Spacing</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">{lineSpacing.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={lineSpacing}
                onChange={(e) => updateMetadataField('lineSpacing', parseFloat(e.target.value) || 1.5)}
                className="w-full accent-purple-600 h-1 rounded bg-slate-200 dark:bg-slate-800 animate-pulse-subtle"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>Line Height</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">{lineHeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => updateMetadataField('lineHeight', parseFloat(e.target.value) || 1.4)}
                className="w-full accent-purple-600 h-1 rounded bg-slate-200 dark:bg-slate-800 animate-pulse-subtle"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>Indent Width (mm)</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">{indentSpacing}mm</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={indentSpacing}
                onChange={(e) => updateMetadataField('indentSpacing', parseInt(e.target.value) || 10)}
                className="w-full accent-purple-600 h-1 rounded bg-slate-200 dark:bg-slate-800 animate-pulse-subtle"
              />
            </div>

            {/* Per-level spacing & highlight settings accordion */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => setShowPerLevel(!showPerLevel)}
                className="flex justify-between items-center w-full text-xs font-bold text-slate-700 dark:text-slate-350 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
              >
                <span>Per-Level Settings</span>
                {showPerLevel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPerLevel && (
                <div className="flex flex-col gap-4 mt-3 max-h-80 overflow-y-auto pr-1">
                  {Array.from({ length: metadata.maxLevel || 12 }).map((_, d) => {
                    // Label based on depth
                    let levelLabel = `Level ${d}`;
                    if (d === 0) levelLabel = "Level 0 (Section)";
                    else if (d === 1) levelLabel = "Level 1 (Topic)";
                    else if (d === 2) levelLabel = "Level 2 (Question)";
                    else if (d === 3) levelLabel = "Level 3 (Answer)";

                    const levelHighlight = levelHighlighting[d] !== undefined ? levelHighlighting[d] : includeHighlighting;
                    const levelSp = levelLineSpacing[d] !== undefined ? levelLineSpacing[d] : lineSpacing;
                    const levelLh = levelLineHeight[d] !== undefined ? levelLineHeight[d] : lineHeight;
                    const levelIndent = levelIndentSpacing[d] !== undefined ? levelIndentSpacing[d] : (d * indentSpacing);

                    return (
                      <div key={d} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-850">
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">{levelLabel}</span>
                          {d >= 2 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">Highlight</span>
                              <input
                                type="checkbox"
                                checked={levelHighlight}
                                onChange={(e) => updateLevelHighlight(d, e.target.checked)}
                                className="w-3 h-3 rounded text-purple-650 border-slate-350 focus:ring-purple-500 accent-purple-650 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[8px] font-bold text-slate-505 uppercase">
                            <span>Line Spacing</span>
                            <span className="font-mono text-purple-600 dark:text-purple-455">{levelSp.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.1"
                            value={levelSp}
                            onChange={(e) => updateLevelLineSpacing(d, parseFloat(e.target.value) || 1.5)}
                            className="w-full accent-purple-600 h-1 rounded bg-slate-200 dark:bg-slate-800"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[8px] font-bold text-slate-505 uppercase">
                            <span>Line Height</span>
                            <span className="font-mono text-purple-600 dark:text-purple-455">{levelLh.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.1"
                            value={levelLh}
                            onChange={(e) => updateLevelLineHeight(d, parseFloat(e.target.value) || 1.4)}
                            className="w-full accent-purple-600 h-1 rounded bg-slate-200 dark:bg-slate-800"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[8px] font-bold text-slate-505 uppercase">
                            <span>Indent Spacing</span>
                            <span className="font-mono text-purple-600 dark:text-purple-455">{levelIndent}mm</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={levelIndent}
                            onChange={(e) => updateLevelIndentSpacing(d, parseInt(e.target.value) || 0)}
                            className="w-full accent-purple-600 h-1 rounded bg-slate-200 dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Print PDF Trigger */}
          <button
            onClick={() => printOutline(project)}
            className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print to PDF
          </button>
        </div>

        {/* Data Downloads Card */}
        <div className="glass rounded-2xl p-5 border border-slate-200 dark:border-slate-850 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-500" />
            File Export Actions
          </h3>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-1">
            Download your outline files for LLM review or full backup restores.
          </p>

          <button
            onClick={handleDownloadOtln}
            className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm group"
          >
            <span className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
              Download Outline (.json)
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handleDownloadBackup}
            className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm group"
          >
            <span className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              Backup Project (.otln-project)
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

      </div>

    </div>
  );
};
