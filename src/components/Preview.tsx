import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PreviewProps {
    content: string;
    themeStyle: {
        bg: string;
        text: string;
        menuHover: string;
        menuBorder: string;
    };
}

export const Preview: React.FC<PreviewProps> = ({ content, themeStyle }) => {
    return (
        <div
            className="h-full w-full overflow-y-auto p-8 prose prose-sm max-w-none"
            style={{
                backgroundColor: themeStyle.bg,
                color: themeStyle.text
            }}
        >
            <style>{`
        .prose {
          color: inherit;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: inherit;
        }
        .prose a {
          color: #3b82f6;
        }
        .prose code {
          background-color: rgba(255,255,255,0.1);
          padding: 0.2em 0.4em;
          border-radius: 4px;
        }
        .prose pre {
          background-color: rgba(0,0,0,0.2);
          padding: 1em;
          border-radius: 6px;
        }
        .prose blockquote {
          border-color: rgba(255,255,255,0.2);
          color: inherit;
          opacity: 0.8;
        }
        .prose table {
          border-collapse: collapse;
          width: 100%;
        }
        .prose th, .prose td {
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.5em;
        }
      `}</style>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};
