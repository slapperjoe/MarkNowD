import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { convertFileSrc } from '@tauri-apps/api/core';

interface PreviewProps {
  content: string;
  themeStyle: {
    bg: string;
    text: string;
    menuHover: string;
    menuBorder: string;
  };
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
          line-height: 1.6;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: inherit;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          line-height: 1.2;
        }
        .prose h1 { font-size: 2.25em; }
        .prose h2 { font-size: 1.875em; border-bottom: 1px solid rgba(150,150,150,0.3); padding-bottom: 0.3em; }
        .prose h3 { font-size: 1.5em; }
        .prose h4 { font-size: 1.25em; }
        .prose h5 { font-size: 1.125em; }
        .prose h6 { font-size: 1em; }
        
        .prose p {
          margin-top: 1.25em;
          margin-bottom: 1.25em;
        }
        
        .prose ul, .prose ol {
          margin-top: 1.25em;
          margin-bottom: 1.25em;
          padding-left: 1.625em;
        }
        .prose li {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose ul { list-style-type: disc; }
        .prose ol { list-style-type: decimal; }

        .prose a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .prose code {
          background-color: rgba(125,125,125,0.2);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875em;
        }
        .prose pre {
          background-color: rgba(0,0,0,0.2);
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin-top: 1.5em;
          margin-bottom: 1.5em;
        }
        .prose pre code {
          background-color: transparent;
          padding: 0;
          font-size: 1em;
          color: inherit;
        }
        .prose blockquote {
          border-left: 4px solid rgba(125,125,125,0.4);
          padding-left: 1em;
          color: inherit;
          opacity: 0.8;
          font-style: italic;
          margin: 1.5em 0;
        }
        .prose table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.5em 0;
        }
        .prose th, .prose td {
          border: 1px solid rgba(125,125,125,0.3);
          padding: 0.75em;
          text-align: left;
        }
        .prose th {
          font-weight: 600;
          background-color: rgba(125,125,125,0.1);
        }
        .prose hr {
          border: 0;
          border-top: 1px solid rgba(125,125,125,0.3);
          margin: 2em 0;
        }
        .prose img {
          max-width: 100%;
          border-radius: 0.375em;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: (props) => {
            let src = props.src || "";
            if (src && !src.startsWith("http") && !src.startsWith("data:")) {
              src = convertFileSrc(src);
            }
            return <img {...props} src={src} />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
