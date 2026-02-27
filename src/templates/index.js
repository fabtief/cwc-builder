export const TEMPLATES = [
  {
    id: 'starter',
    label: 'Starter Template',
    description: 'Minimales generisches CWC Template',
    match: [],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="./libraries/webcc.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }

    /* ================================================
       Styles hier einfügen
       ================================================ */
    #root {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>

  <!-- ================================================
       HTML Struktur hier aufbauen
       ================================================ -->
  <div id="root"></div>

  <script src="./libraries/[IHRE_LIBRARY].js"><\/script>
  <script src="./code.js"><\/script>
</body>
</html>`,
    code: `// ================================================
// VARIABLEN
// ================================================
var el = null;


// ================================================
// PROPERTY CHANGE HANDLER
// data.key   → Name der Property
// data.value → Neuer Wert
// ================================================
function setProperty(data) {
    switch (data.key) {

        case 'MeineProperty':
            // Control aktualisieren
            // if (el) el.textContent = data.value;
            break;

        // Weitere Properties hier als case-Blöcke...

    }
}


// ================================================
// INITIALISIERUNG
// ================================================
WebCC.start(
    function(result) {
        if (!result) return;

        // ================================================
        // INITIALISIERUNG
        // Hier Library-Objekte erstellen und DOM-Elemente
        // holen, z.B.:
        //
        // el = document.getElementById('root');
        //
        // gauge = new Gauge(document.getElementById('gauge'));
        // gauge.setOptions({ ... });
        //
        // chart = new Chart(ctx, { ... });
        // ================================================

        // Startwerte aus Properties anwenden
        setProperty({ key: 'MeineProperty', value: WebCC.Properties.MeineProperty });

        // Auf spätere Property-Änderungen reagieren
        WebCC.onPropertyChanged.subscribe(setProperty);
    },
    {
        properties: {
            MeineProperty: ''
        },
        events: [],
        methods: {}
    },
    [],
    10000
);`
  }
]

export function detectTemplate(libraries) {
  if (!libraries || libraries.length === 0) return null
  const names = libraries.map(l => l.name.toLowerCase()).join(' ')
  return TEMPLATES.find(t => t.match.length > 0 && t.match.some(k => names.includes(k))) || null
}