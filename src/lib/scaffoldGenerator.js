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

  // event listener stubs — positional args in manifest order
  const eventListeners = evts.map(e => {
    const paramList = (e.parameters || '').split(',').map(s => s.trim()).filter(Boolean)
    const args = paramList.length > 0 ? ', ' + paramList.join(', ') : ''
    return `
        // WebCC.Events.fire('${e.name}'${args});`
  }).join('')

  // contracts: properties
  const contractProps = props.map(p =>
    `            ${p.name}: ${defaultValue(p.type, p.defaultValue)}`
  ).join(',\n')

  // contracts: events
  const contractEvents = evts.length > 0
    ? `[${evts.map(e => `'${e.name}'`).join(', ')}]`
    : '[]'

  // contracts: methods — wrapper delegates to standalone function
  const contractMethods = meths.length > 0
    ? `{\n${meths.map(m => {
        const paramList = (m.parameters || '').split(',').map(s => s.trim()).filter(Boolean)
        const comment   = paramList.length > 0 ? ` // params: ${paramList.join(', ')}` : ''
        return `                ${m.name}: function(param){ ${m.name}(param); }${comment}`
      }).join(',\n')}\n            }`
    : '{}'

  // method handler functions — placed between PROPERTY HANDLER and INIT
  const methodHandlers = meths.length > 0
    ? `// ── METHOD HANDLERS ──────────────────────────────────────────\n${
        meths.map(m => {
          const paramList = (m.parameters || '').split(',').map(s => s.trim()).filter(Boolean)
          const paramTypes = (m.paramTypes  || '').split(',').map(s => s.trim())
          const varLines = paramList.map((p, i) => {
            const t = ['string','number','boolean'].includes(paramTypes[i]) ? paramTypes[i] : 'string'
            return `    var ${p} = param.${p}; // ${t}`
          }).join('\n')
          return `function ${m.name}(param) {\n${varLines ? varLines + '\n' : ''}\n    // TODO\n\n}`
        }).join('\n\n')
      }\n\n`
    : ''

  return starterCode
    .replace('{{CASES}}',            cases           || `\n        // case 'MyProperty': break;`)
    .replace('{{INIT_CALLS}}',       initCalls       || `        // setProperty({ key: 'MyProperty', value: WebCC.Properties.MyProperty });`)
    .replace('{{EVENT_LISTENERS}}',  eventListeners  || '')
    .replace('{{CONTRACT_PROPS}}',   contractProps   || `            // MyProperty: ''`)
    .replace('{{CONTRACT_EVENTS}}',  contractEvents)
    .replace('{{CONTRACT_METHODS}}', contractMethods)
    .replace('{{METHOD_HANDLERS}}',  methodHandlers)
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
   Load in the screen Loaded event in TIA Portal:
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

/* ── CSS custom properties (design tokens) ──────────────────
   Override any of these to restyle all controls at once.
   Place overrides in :root { } or a more specific selector.
─────────────────────────────────────────────────────────────── */
:root {

  /* Typography */
  --cwc-font-family:      'Segoe UI', Arial, sans-serif;
  --cwc-font-size:        14px;
  --cwc-font-size-small:  12px;
  --cwc-font-size-large:  16px;
  --cwc-font-weight:      400;
  --cwc-font-weight-bold: 600;
  --cwc-line-height:      1.4;

  /* Colors — backgrounds */
  --cwc-color-background:       transparent;
  --cwc-color-background-panel: #ffffff;
  --cwc-color-background-alt:   #f4f6f8;
  --cwc-color-background-input: #ffffff;

  /* Colors — text */
  --cwc-color-text:         #1a1a1a;
  --cwc-color-text-muted:   #6b7280;
  --cwc-color-text-inverse: #ffffff;

  /* Colors — borders */
  --cwc-color-border:       #d1d5db;
  --cwc-color-border-focus: #2563eb;

  /* Colors — accent / interactive */
  --cwc-color-primary:        #2563eb;
  --cwc-color-primary-hover:  #1d4ed8;
  --cwc-color-success:        #16a34a;
  --cwc-color-warning:        #d97706;
  --cwc-color-error:          #dc2626;

  /* Shape */
  --cwc-border-radius:       4px;
  --cwc-border-radius-large: 8px;
  --cwc-border-width:        1px;

  /* Spacing */
  --cwc-spacing-xs: 4px;
  --cwc-spacing-sm: 8px;
  --cwc-spacing-md: 12px;
  --cwc-spacing-lg: 16px;
  --cwc-spacing-xl: 24px;

  /* Elevation */
  --cwc-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --cwc-shadow-md: 0 2px 8px rgba(0,0,0,0.10);
  --cwc-shadow-lg: 0 4px 16px rgba(0,0,0,0.15);
}

/* ── base element styles ─────────────────────────────────── */

/* ── panel ───────────────────────────────────────────────── */

/* ── typography ─────────────────────────────────────────── */

/* ── inputs & buttons ───────────────────────────────────── */

/* ── layout utilities ───────────────────────────────────── */
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