import React, { useMemo, useRef, useEffect } from 'react';
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
  const quillRef = useRef<ReactQuill>(null);

  // Custom link handler to fix URL prefixing issue
  const linkHandler = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) return;

    const currentLink = quill.getFormat(range.index, range.length).link;
    const url = prompt('Enter URL:', currentLink || 'https://');
    
    if (url === null) return; // User cancelled
    
    if (url === '') {
      // Remove link
      quill.format('link', false);
    } else {
      // Add proper protocol if missing
      let formattedUrl = url;
      if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
        formattedUrl = `https://${url}`;
      }
      quill.format('link', formattedUrl);
    }
  };

  // Configure toolbar modules with custom link handler
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }], // H1, H2, H3
        ['bold', 'italic', 'underline'], // Bold, Italic, Underline
        [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Ordered and unordered lists
        ['link'], // URL links with custom handler
        [{ 'indent': '-1'}, { 'indent': '+1' }], // Indent/outdent
        ['clean'] // Remove formatting
      ],
      handlers: {
        link: linkHandler
      }
    },
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
        ref={quillRef}
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