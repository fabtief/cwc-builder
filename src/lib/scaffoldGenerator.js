// ================================================
// Generiert code.js und index.html aus der
// Interface-Definition (Properties, Events, Methods)
// Beide verwenden dieselben Template-Dateien:
//   src/templates/starter.js
//   src/templates/starter.html
// ================================================

import starterCode from '../templates/starter.js?raw'
import starterHtml from '../templates/starter.html?raw'


// ── Generiert code.js ────────────────────────────────────────
export function generateScaffold(properties, events, methods) {
  const props = (properties || []).filter(p => p.name.trim())
  const evts  = (events     || []).filter(e => e.name.trim())
  const meths = (methods    || []).filter(m => m.name.trim())

  // ── setProperty switch cases ──
  const cases = props.map(p => `
        case '${p.name}':
            // ${p.type} — Control aktualisieren
            break;`).join('')

  // ── Startwerte anwenden ──
  const initCalls = props.map(p =>
    `        setProperty({ key: '${p.name}', value: WebCC.Properties.${p.name} });`
  ).join('\n')

  // ── Event-Listener Kommentare ──
  const eventListeners = evts.map(e => `
        // Event '${e.name}' an TIA Portal senden:
        // el.addEventListener('...', function() {
        //     WebCC.Events.fire('${e.name}', { });
        // });`).join('')

  // ── Contracts: properties ──
  const contractProps = props.map(p =>
    `            ${p.name}: ${defaultValue(p.type, p.defaultValue)}`
  ).join(',\n')

  // ── Contracts: events ──
  const contractEvents = evts.length > 0
    ? `[${evts.map(e => `'${e.name}'`).join(', ')}]`
    : '[]'

  // ── Contracts: methods ──
  const contractMethods = meths.length > 0
    ? `{\n${meths.map(m =>
        `                ${m.name}: function() {\n                    // TODO\n                }`
      ).join(',\n')}\n            }`
    : '{}'

  return starterCode
    .replace('{{CASES}}',            cases           || `\n        case 'MeineProperty':\n            // Control aktualisieren\n            break;`)
    .replace('{{INIT_CALLS}}',       initCalls       || `        setProperty({ key: 'MeineProperty', value: WebCC.Properties.MeineProperty });`)
    .replace('{{EVENT_LISTENERS}}',  eventListeners  || '')
    .replace('{{CONTRACT_PROPS}}',   contractProps   || `            MeineProperty: ''`)
    .replace('{{CONTRACT_EVENTS}}',  contractEvents)
    .replace('{{CONTRACT_METHODS}}', contractMethods)
}


// ── Generiert index.html mit korrekten Library-Pfaden ────────
export function generateHtml(metadata, libraries) {
  const libScripts = (libraries || [])
    .filter(l => l.name.trim() && !l.name.endsWith('.css'))
    .map(l => `  <script src="./libraries/${l.name}"><\/script>`)
    .join('\n')

  const libStyles = (libraries || [])
    .filter(l => l.name.endsWith('.css'))
    .map(l => `  <link rel="stylesheet" href="./libraries/${l.name}" />`)
    .join('\n')

  return starterHtml
    .replace('{{LIB_STYLES}}', libStyles)
    .replace('{{LIB_SCRIPTS}}', libScripts)
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