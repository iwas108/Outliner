import React, { useEffect, useRef } from 'react';

interface MathJaxRendererProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  renderHighlightText?: (text: string) => React.ReactNode;
  onClick?: () => void;
}

export const MathJaxRenderer: React.FC<MathJaxRendererProps> = ({
  text,
  className,
  style,
  renderHighlightText,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    interface MathJaxWindow extends Window {
      MathJax?: {
        typesetPromise: (el: HTMLElement[]) => Promise<void>;
        typesetClear: (el: HTMLElement[]) => void;
      };
    }
    const win = window as unknown as MathJaxWindow;
    if (win.MathJax && typeof win.MathJax.typesetPromise === 'function') {
      const mj = win.MathJax;
      const timeoutId = setTimeout(() => {
        try {
          // Clear any previous typesetting in MathJax's cache for this element
          mj.typesetClear([el]);
          // Typeset the element
          mj.typesetPromise([el]).catch((err: unknown) => {
            console.error('MathJax typesetPromise error:', err);
          });
        } catch (err) {
          console.error('MathJax processing error:', err);
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onClick={onClick}
    >
      {renderHighlightText ? renderHighlightText(text) : text}
    </div>
  );
};
