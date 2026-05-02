// Debug session bootstrap: runs before App graph (must stay first import in index.js).
// #region agent log
fetch('http://127.0.0.1:7511/ingest/db767e00-c052-4683-b444-f8807d9fc7e9', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2a656f' },
  body: JSON.stringify({
    sessionId: '2a656f',
    location: 'debug-session-entry.js',
    message: 'JS entry before App module graph',
    data: { note: 'If ExpoSecureStore missing, crash happens during App import chain' },
    timestamp: Date.now(),
    hypothesisId: 'A',
    runId: 'native-pod-verify',
  }),
}).catch(() => {});
// #endregion
