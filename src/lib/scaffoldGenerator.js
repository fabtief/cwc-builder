// ── scaffoldGenerator.js ─────────────────────────────────────
// Generates code.js, index.html, and theme.css from the
// interface definition (properties, events, methods).
// Templates: src/templates/starter.js + starter.html
// ─────────────────────────────────────────────────────────────

import starterCode from '../templates/starter.js?raw'
import starterHtml from '../templates/starter.html?raw'


// ── Generate code.js ─────────────────────────────────────────
export function generateScaffold(properties, events, methods) {
  const props = (properties || []).filter(p => p.name.trim())
  const evts  = (events     || []).filter(e => e.name.trim())
  const meths = (methods    || []).filter(m => m.name.trim())

  // setProperty switch cases — customCSS gets a full implementation
  const cases = props.map(p => {
    if (p.name === 'customCSS') {
      return `
        case 'customCSS':
            var styleTag = document.getElementById('cwc-custom-style');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'cwc-custom-style';
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = data.value || '';
            break;`
    }
    return `
        case '${p.name}':
            // ${p.type}
            break;`
  }).join('')

  // apply initial values
  const initCalls = props.map(p =>
    `        setProperty({ key: '${p.name}', value: WebCC.Properties.${p.name} });`
  ).join('\n')

  // event listener stubs
  const eventListeners = evts.map(e => `
        // WebCC.Events.fire('${e.name}', { });`).join('')

  // contracts: properties
  const contractProps = props.map(p =>
    `            ${p.name}: ${defaultValue(p.type, p.defaultValue)}`
  ).join(',\n')

  // contracts: events
  const contractEvents = evts.length > 0
    ? `[${evts.map(e => `'${e.name}'`).join(', ')}]`
    : '[]'

  // contracts: methods
  const contractMethods = meths.length > 0
    ? `{\n${meths.map(m =>
        `                ${m.name}: function() { /* TODO */ }`
      ).join(',\n')}\n            }`
    : '{}'

  return starterCode
    .replace('{{CASES}}',            cases           || `\n        // case 'MyProperty': break;`)
    .replace('{{INIT_CALLS}}',       initCalls       || `        // setProperty({ key: 'MyProperty', value: WebCC.Properties.MyProperty });`)
    .replace('{{EVENT_LISTENERS}}',  eventListeners  || '')
    .replace('{{CONTRACT_PROPS}}',   contractProps   || `            // MyProperty: ''`)
    .replace('{{CONTRACT_EVENTS}}',  contractEvents)
    .replace('{{CONTRACT_METHODS}}', contractMethods)
}


// ── Generate index.html ──────────────────────────────────────
export function generateHtml(metadata, libraries) {
  const libStyles = (libraries || [])
    .filter(l => l.name.trim() && l.name.endsWith('.css'))
    .map(l => `  <link rel="stylesheet" href="./libraries/${l.name}" />`)
    .join('\n')

  const libScripts = (libraries || [])
    .filter(l => l.name.trim() && !l.name.endsWith('.css'))
    .map(l => `  <script src="./libraries/${l.name}"><\/script>`)
    .join('\n')

  return starterHtml
    .replace('{{LIB_STYLES}}',  libStyles)
    .replace('{{LIB_SCRIPTS}}', libScripts)
}


// ── Generate theme.css ───────────────────────────────────────
export function generateThemeCss(properties) {
  const props = (properties || []).filter(p => p.name.trim())
  const hasCustomCss = props.some(p => p.name === 'customCSS')

  const customCssNote = hasCustomCss
    ? ''
    : '\n   Note: add a "customCSS" string property in Step 3 to enable live theme injection.\n'

  return `/* ── theme.css ─────────────────────────────────────────────────
   Deploy to the HMI device at a publicly accessible path, e.g.:
       C:\\Users\\Public\\theme.css
   (WinCC must have read permission on the folder)
${customCssNote}
   Load in the screen's Loaded event in TIA Portal:
   ─────────────────────────────────────────────────────────────
   HMIRuntime.FileSystem.ReadFile("C:\\\\Users\\\\Public\\\\theme.css", "utf8")
     .then(function(customCSS) {
       for (const screenItem of Screen.Items) {
         try {
           screenItem.Properties.customCSS = customCSS;
         } catch(e) {
           HMIRuntime.Trace("Set failed: " + e);
         }
       }
     })
     .catch(function(err) {
       HMIRuntime.Trace("Read error: " + err);
     });
   ─────────────────────────────────────────────────────────────
   This runs on every page load — edit theme.css on the device
   and navigate away/back to see changes without redeploying.
────────────────────────────────────────────────────────────── */

/* ── reset ──────────────────────────────────────────────── */

/* ── typography ─────────────────────────────────────────── */

/* ── colors ─────────────────────────────────────────────── */

/* ── layout ─────────────────────────────────────────────── */
`
}


// ── Helper: default value by type ───────────────────────────
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
