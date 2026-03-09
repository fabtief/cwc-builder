import starterHtml from './starter.html?raw'
import starterCode from './starter.js?raw'

export const TEMPLATES = [
  {
    id: 'starter',
    label: 'Starter Template',
    description: 'Minimales generisches CWC Template',
    match: [],
    html: starterHtml
      .replace('{{LIB_STYLES}}', '')
      .replace('{{LIB_SCRIPTS}}', ''),
    code: starterCode
      .replace('{{CASES}}', `case 'MeineProperty':\n            // Control aktualisieren\n            break;`)
      .replace('{{INIT_CALLS}}', `setProperty({ key: 'MeineProperty', value: WebCC.Properties.MeineProperty });`)
      .replace('{{EVENT_LISTENERS}}', '')
      .replace('{{CONTRACT_PROPS}}', `MeineProperty: ''`)
      .replace('{{CONTRACT_EVENTS}}', `[]`)
      .replace('{{CONTRACT_METHODS}}', `{}`)
  }
]

export function detectTemplate(libraries) {
  if (!libraries || libraries.length === 0) return null
  const names = libraries.map(l => l.name.toLowerCase()).join(' ')
  return TEMPLATES.find(t => t.match.length > 0 && t.match.some(k => names.includes(k))) || null
}