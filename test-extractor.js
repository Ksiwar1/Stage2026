const fs = require('fs');
const path = require('path');
const memory = require('./src/lib/memory.ts'); // Wait, loading TS in Node is hard. Let's strictly read the file and replicate logic.
