export function generateHtml(metadata, libraries) {
  const libScripts = libraries
    .filter(l => l.name.trim() && l.content.trim())
    .map(l => {
      // Fix: Pfad muss zum zipExporter passen (./libraries/...)
      if (l.name.endsWith('.css')) {
        return `<link rel="stylesheet" href="./libraries/${l.name}">`;
      }
      return `<script src="./libraries/${l.name}"></script>`;
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${metadata.name || 'CWC'}</title>
    <!-- Fix: webcc.min.js muss als erstes geladen werden [6] -->
    <script src="./webcc.min.js"></script>
    ${libScripts}
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    </style>
</head>
<body>
    <div id="cwc-container"></div>
    <script src="./code.js"></script>
</body>
</html>`;
}