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

  // Custom URL link handler
  const urlHandler = () => {
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
      if (!/^https?:\/\//i.test(url)) {
        formattedUrl = `https://${url}`;
      }
      quill.format('link', formattedUrl);
    }
  };

  // Custom email link handler
  const emailHandler = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) return;

    const currentLink = quill.getFormat(range.index, range.length).link;
    const currentEmail = currentLink?.startsWith('mailto:') ? currentLink.replace('mailto:', '') : '';
    const email = prompt('Enter email address:', currentEmail);
    
    if (email === null) return; // User cancelled
    
    if (email === '') {
      // Remove link
      quill.format('link', false);
    } else {
      quill.format('link', `mailto:${email}`);
    }
  };

  // Configure toolbar modules with separate URL and email handlers
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }], // H1, H2, H3
        ['bold', 'italic', 'underline'], // Bold, Italic, Underline
        [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Ordered and unordered lists
        ['url', 'email'], // Separate URL and email buttons
        [{ 'indent': '-1'}, { 'indent': '+1' }], // Indent/outdent
        ['clean'] // Remove formatting
      ],
      handlers: {
        url: urlHandler,
        email: emailHandler
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

  // Add custom button styles after component mounts
  useEffect(() => {
    const addCustomButtons = () => {
      const toolbar = document.querySelector('.rich-text-editor .ql-toolbar');
      if (!toolbar) return;

      // Find and replace URL button
      const urlButton = toolbar.querySelector('.ql-url');
      if (urlButton) {
        urlButton.innerHTML = `<svg viewBox="0 0 18 18" width="18" height="18"><path class="ql-stroke" d="M7,11H3a4,4,0,0,1,0-8H7"></path><path class="ql-stroke" d="M11,7h4a4,4,0,0,1,0,8H11"></path><line class="ql-stroke" x1="9" y1="9" x2="9" y2="9"></line></svg>`;
        urlButton.setAttribute('title', 'Add URL Link');
      }

      // Find and replace email button
      const emailButton = toolbar.querySelector('.ql-email');
      if (emailButton) {
        emailButton.innerHTML = `<svg viewBox="0 0 18 18" width="18" height="18"><rect class="ql-stroke" x="2" y="4" width="14" height="10" rx="1"></rect><path class="ql-stroke" d="M2,4l7,6,7-6"></path></svg>`;
        emailButton.setAttribute('title', 'Add Email Link');
      }
    };

    // Add buttons after a short delay to ensure Quill is rendered
    const timer = setTimeout(addCustomButtons, 100);
    return () => clearTimeout(timer);
  }, []);

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