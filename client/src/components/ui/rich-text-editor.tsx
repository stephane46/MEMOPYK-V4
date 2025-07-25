import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './rich-text-editor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  // Configure toolbar modules with all requested features
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }], // H1, H2, H3
      ['bold', 'italic', 'underline'], // Bold, Italic, Underline
      [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Ordered and unordered lists
      ['link'], // URL links (we'll handle email separately in CSS)
      [{ 'indent': '-1'}, { 'indent': '+1' }], // Indent/outdent
      ['clean'] // Remove formatting
    ],
    clipboard: {
      // Strip formatting when pasting
      matchVisual: false,
    }
  }), []);

  // Configure allowed formats
  const formats = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'indent',
    'link'
  ];

  return (
    <div className={`rich-text-editor ${className || ''}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}