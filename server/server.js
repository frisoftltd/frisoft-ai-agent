/*
  server.js — Express app entry point.
  Step 2: serves /public only (static site + mocked chat widget). No
  /api routes yet — those (and CORS, rate limiting) are added in Step 3/4.
  Built in: Phase 1 (Fri Soft demo site), Step 2.
*/
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Fri Soft AI agent (static) listening on http://localhost:${PORT}`);
});
