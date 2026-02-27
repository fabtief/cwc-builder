// ================================================
// Generiert code.js aus der Interface-Definition
// (Properties, Events, Methods aus Schritt 3)
// ================================================

export function generateScaffold(properties, events, methods) {
  const props    = (properties || []).filter(p => p.name.trim())
  const evts     = (events     || []).filter(e => e.name.trim())
  const meths    = (methods    || []).filter(m => m.name.trim())

  // ── setProperty switch cases ──
  const cases = props.map(p => `
        case '${p.name}':
            // ${p.type} — Control aktualisieren
            // if (el) el... = data.value;
            break;`).join('')

  // ── Startwerte anwenden ──
  const initCalls = props.map(p =>
    `        setProperty({ key: '${p.name}', value: WebCC.Properties.${p.name} });`
  ).join('\n')

  // ── Event-Listener ──
  const eventListeners = evts.map(e => `
        // Event '${e.name}' an TIA Portal senden:
        // el.addEventListener('...', function() {
        //     WebCC.Events.fire('${e.name}', { });
        // });`).join('')

  // ── Contracts: properties ──
  const contractProps = props.map(p => {
    const def = defaultValue(p.type, p.defaultValue)
    return `            ${p.name}: ${def}`
  }).join(',\n')

  // ── Contracts: events ──
  const contractEvents = evts.length > 0
    ? `[${evts.map(e => `'${e.name}'`).join(', ')}]`
    : '[]'

  // ── Contracts: methods ──
  const contractMethods = meths.length > 0
    ? `{\n${meths.map(m => `                ${m.name}: function() {\n                    // TODO\n                }`).join(',\n')}\n            }`
    : '{}'

  return `// ================================================
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
${cases || `
        case 'MeineProperty':
            // Control aktualisieren
            break;`}
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
${initCalls}

${eventListeners}
        // Auf spätere Property-Änderungen reagieren
        WebCC.onPropertyChanged.subscribe(setProperty);
    },
    // Contracts — Standardwerte
    {
        properties: {
${contractProps || `            MeineProperty: ''`}
        },
        events: ${contractEvents},
        methods: ${contractMethods}
    },
    [],
    10000
);`
}

// ── Generiert index.html mit korrekten Library-Pfaden ──
export function generateHtml(metadata, libraries) {
  const libScripts = (libraries || [])
    .filter(l => l.name.trim() && !l.name.endsWith('.css'))
    .map(l => `  <script src="./libraries/${l.name}"><\/script>`)
    .join('\n')

  const libStyles = (libraries || [])
    .filter(l => l.name.endsWith('.css'))
    .map(l => `  <link rel="stylesheet" href="./libraries/${l.name}" />`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="./libraries/webcc.min.js"><\/script>
${libStyles}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #root { width: 100%; height: 100%; }
  </style>
</head>
<body>

  <div id="root"></div>

${libScripts}
  <script src="./code.js"><\/script>
</body>
</html>`
}

// ── Hilfsfunktion: Standardwert je Typ ──────────────────────
function defaultValue(type, value) {
  if (value !== undefined && value !== '') {
    if (type === 'number')  return parseFloat(value) || 0
    if (type === 'boolean') return value === 'true' ? 'true' : 'false'
    return `'${value}'`
  }
  switch (type) {
    case 'number':  return '0'
    case 'boolean': return 'false'
    case 'array':   return "'[]'"
    default:        return "''"
  }
}