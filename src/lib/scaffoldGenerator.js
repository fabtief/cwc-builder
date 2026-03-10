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

  // setProperty switch cases
  const cases = props.map(p => `
        case '${p.name}':
            // ${p.type}
            break;`).join('')

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

  return `/* ── theme.css ───────────────────────────────────────────────
   Lives on the HMI device at: UserFiles\\CWC\\theme.css
   Not bundled in the ZIP by default.

   In TIA Portal, read once and assign to each control:
       HmiRuntime.FileSystem.ReadAllText('UserFiles\\CWC\\theme.css',
           function(err, css) {
               if (!err) Screens('MyScreen')
                   .ScreenItems('MyControl').customCSS = css;
           }
       );
${hasCustomCss ? '' : '\n   Note: add a "customCSS" string property to your control\n   to enable live theme injection.\n'}────────────────────────────────────────────────────────── */

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
