# CWC Builder

A browser-based generator for Siemens WinCC Unified Custom Web Controls (CWC). Designed for automation engineers who want to build CWCs without deep JavaScript knowledge or a complex development environment.

---

## What it does

CWC Builder walks you through a 4-step wizard to produce a ready-to-import `.zip` file for TIA Portal:

1. **Libraries** — Upload third-party JavaScript/CSS libraries (e.g. Chart.js, Tabulator, Gauge.js)
2. **Metadata** — Set the control name, GUID, version and description
3. **Interface** — Define properties, events and methods exposed to TIA Portal
4. **Editor & Preview** — Write or generate `code.js` and `index.html`, preview the control live in the browser, then export the ZIP

The generated ZIP follows the WinCC Unified CWC file format (manifest version 1.2.0) and can be imported directly into TIA Portal via the Custom Controls manager.

---

## Requirements

- Node.js 18 or later
- npm 9 or later

---

## Installation

Clone the repository:

```bash
git clone https://github.com/fabtief/cwc-builder.git
cd cwc-builder
```

Install dependencies:

```bash
npm install
```

Place the Siemens `webcc.min.js` file in the `src/lib/` directory. This file is part of the WinCC Unified installation and is not included in this repository for licensing reasons. It can be found at:

```
<TIA Portal installation>\Siemens\Automation\WinCCUnified\CWC\webcc.min.js
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Build for production

```bash
npm run build
```

The output is placed in the `dist/` folder and can be served as a static site.

---

## Project structure (simplified)

```
cwc-builder/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── Wizard.jsx              # Step navigation and layout
│   │   └── wizard/
│   │       ├── Step1_Libraries.jsx
│   │       ├── Step2_Metadata.jsx
│   │       ├── Step3_Interface.jsx
│   │       └── Step4_Editor.jsx        # Editor + live preview + export
│   ├── lib/
│   │   ├── manifestGenerator.js        # Generates manifest.json (mver 1.2.0)
│   │   ├── scaffoldGenerator.js        # Generates code.js from interface definition
│   │   ├── webccMock.js                # Browser mock of the WebCC runtime API
│   │   ├── zipExporter.js              # Builds and downloads the CWC ZIP
│   │   └── webcc.min.js                # Siemens runtime API (not included, see above)
│   ├── store/
│   │   └── projectStore.js             # React context, localStorage persistence
│   ├── templates/
│   |   └── index.js                    # Starter templates for code.js and index.html
|   └── App.css
|   └── App.jsx
|   └── index.css
|   └── index.jsx
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## WebCC API reference

The generated controls use the official WinCC Unified WebCC API:

```js
WebCC.start(callback, contracts, extensions, timeout)
```

```js
// Read or write a property
WebCC.Properties.MyProperty

// Subscribe to property changes
WebCC.onPropertyChanged.subscribe(function(data) {
    // data.key   — property name
    // data.value — new value
});

// Fire an event to TIA Portal
WebCC.Events.fire('EventName', { parameter: value });
```

---

## TIA Portal integration notes

After importing the ZIP, set the container border style in your screen script if needed:

```javascript
item.WindowFlags = UI.Enums.HmiWindowFlag.None;
```

---

## License

MIT

## Author

Built by [fabtief](https://github.com/fabtief)
