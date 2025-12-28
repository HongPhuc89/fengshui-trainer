import { useEffect, useRef } from 'react';

export const MarkmapPreview = ({ markdown }: { markdown: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !markdown) return;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
    }
    .markmap {
      width: 100%;
      height: 650px;
    }
    .markmap > svg {
      width: 100%;
      height: 100%;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/markmap-autoloader"></script>
</head>
<body>
  <div class="markmap">
    <script type="text/template">
${markdown}
    </script>
  </div>
</body>
</html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }, [markdown]);

  return (
    <iframe
      key={markdown} // Force re-render when markdown changes
      ref={iframeRef}
      style={{
        width: '100%',
        height: '700px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fff',
      }}
      title="Markmap Preview"
    />
  );
};
