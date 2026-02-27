// ================================================
// VARIABLEN
// ================================================
var el     = null;   // div-basierte Libraries
var canvas = null;   // Canvas-basierte Libraries
var lib    = null;   // Library-Instanz


// ================================================
// PROPERTY CHANGE HANDLER
// data.key   → Name der Property
// data.value → Neuer Wert
// ================================================
function setProperty(data) {
    switch (data.key) {

        {{CASES}}

    }
}


// ================================================
// INITIALISIERUNG
// ================================================
WebCC.start(
    function(result) {
        if (!result) return;

        // ================================================
        // DOM-Elemente holen
        // ================================================
        el     = document.getElementById('cwc-root');
        canvas = document.getElementById('cwc-canvas');

        // ================================================
        // LIBRARY INITIALISIEREN
        // Beispiele:
        //
        // Gauge.js:
        // lib = new Gauge(canvas);
        // lib.setOptions({ ... });
        // lib.animationSpeed = 11;
        //
        // Tabulator:
        // lib = new Tabulator(el, { layout: 'fitColumns' });
        //
        // ApexCharts:
        // lib = new ApexCharts(el, { chart: { type: 'line' } });
        // lib.render();
        // ================================================

        // Startwerte aus Properties anwenden
        {{INIT_CALLS}}

        {{EVENT_LISTENERS}}

        // Auf spätere Property-Änderungen reagieren
        WebCC.onPropertyChanged.subscribe(setProperty);
    },
    // Contracts — Standardwerte
    {
        properties: {
            {{CONTRACT_PROPS}}
        },
        events: {{CONTRACT_EVENTS}},
        methods: {{CONTRACT_METHODS}}
    },
    [],
    10000
);