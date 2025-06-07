import { useRef } from 'react';
import { SimpleNoteContent, SimpleNoteContentRef } from '@/components/SimpleNoteEditor/SimpleNoteContent';

export function RichTextEditor() {
  const editorRef = useRef<SimpleNoteContentRef>(null);

  const handleSave = () => {
    const currentContentHTML = editorRef.current?.editor?.getHTML();
    const currentContentJSON = editorRef.current?.editor?.getJSON();
    console.log('保存的HTML内容:', currentContentHTML);
    console.log('保存的JSON内容:', currentContentJSON);
  };

  return (
    <div className="editor-container p-6 w-full h-96">
      <div className="border h-full p-4">
        <SimpleNoteContent
          noteId="temp" //这个暂时写死
          ref={editorRef}
          editable="all"
          content=""
          onKeyDown={(event) => console.log('按下了键：', event.key)}
        />
      </div>
      <div className="mt-2">
        <button onClick={handleSave}>保存</button>
      </div>
    </div>
  );
}