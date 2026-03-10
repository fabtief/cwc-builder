// ── VARIABLES ────────────────────────────────────────────────
var el     = null;  // mount point for div-based libraries
var canvas = null;  // mount point for canvas-based libraries
var lib    = null;  // library instance

// Debug: HMIRuntime.Trace('msg') → WinCC Trace Viewer + CWC Builder log


// ── PROPERTY HANDLER ─────────────────────────────────────────
function setProperty(data) {
    switch (data.key) {

        {{CASES}}

    }
}


// ── INIT ─────────────────────────────────────────────────────
WebCC.start(
    function(result) {
        if (!result) return;

        el     = document.getElementById('cwc-root');
        canvas = document.getElementById('cwc-canvas');

        // TODO: initialize library
        // canvas.style.display = 'block'; // ← enable for canvas-based libs
        // lib = new MyLib(el, { ... });

        {{INIT_CALLS}}
        {{EVENT_LISTENERS}}

        WebCC.onPropertyChanged.subscribe(setProperty);
    },
    {
        properties: {
            {{CONTRACT_PROPS}}
        },
        events:  {{CONTRACT_EVENTS}},
        methods: {{CONTRACT_METHODS}}
    },
    [],
    10000
);
