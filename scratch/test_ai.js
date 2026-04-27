const { config } = require('dotenv');
const { resolve } = require('path');
config({ path: resolve(process.cwd(), '.env.local') });

// Register ts-node on the fly if needed, or simply transpile
require('ts-node').register({
  compilerOptions: { module: 'commonjs' }
});

const { getPromptSystemForAI } = require('../src/lib/memory.ts');
const { generateAIResponse } = require('../src/lib/aiClient.ts');

async function runTest() {
  const systemPrompt = getPromptSystemForAI('generique', [], false, 2);
  
  const dummyArchitecture = {
    "workflow": {
      "cat_1": {
        "type": "categories",
        "rank": 1,
        "content": {
          "item_test_sansprix": { "type": "items", "rank": 1 },
          "item_test_modifier": { "type": "items", "rank": 2 },
          "item_test_ambigu": { "type": "items", "rank": 3 }
        }
      }
    },
    "categories": {
      "cat_1": { "title": "Tests Edge Cases", "isVisible": true }
    }
  };

  const userPrompt = `Sujet demandé: Je veux un restaurant de Test.\n\nVoici le squelette de la carte:\n${JSON.stringify(dummyArchitecture, null, 2)}`;

  console.log("Input Prompt Token Size estimation:", (systemPrompt.length + userPrompt.length) / 4);

  const start = Date.now();
  console.log("Calling Gemini 2.5 Flash...");
  try {
    let result = await generateAIResponse(systemPrompt, userPrompt, 0.7, 'gemini');
    const end = Date.now();
    
    console.log(`Latency: ${end - start}ms`);
    result = result.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
    
    const parsed = JSON.parse(result);
    console.log("Parsed keys:", Object.keys(parsed));
    console.log("Items:", JSON.stringify(parsed.items, null, 2));
    if (parsed.modifier) console.log("Modifiers:", Object.keys(parsed.modifier).length);
    if (parsed.steps) console.log("Steps:", Object.keys(parsed.steps).length);
    
    // Check required fields
    let passed = true;
    for (const key of ['item_test_sansprix', 'item_test_modifier', 'item_test_ambigu']) {
        if (!parsed.items[key]) {
             console.error(`MISSING ITEM: ${key}`);
             passed = false;
        } else {
             const it = parsed.items[key];
             if (!it.title) { console.error(`MISSING title in ${key}`); passed = false; }
             if (it.t) { console.error(`LEAKED ALIAS 't' in ${key}`); passed = false; }
             if (it.p !== undefined) { console.error(`LEAKED ALIAS 'p' in ${key}`); passed = false; }
             if (it.m) { console.error(`LEAKED ALIAS 'm' in ${key}`); passed = false; }
             if (it.price && typeof it.price === 'object' && it.price.dflt && it.price.dflt.ttc !== undefined) {
                 // Good
             } else if (!it.price) {
                 // That's acceptable for no price if it's missing, but it is an issue if it generated flat price.
                 console.log(`No price in ${key}`);
             } else {
                 console.error(`BAD PRICE FORMAT in ${key}:`, it.price); passed = false;
             }
        }
    }
    console.log("TEST RESULT:", passed ? "PASSED" : "FAILED");
  } catch(e) {
    console.error("TEST FATAL ERROR:", e);
  }
}

runTest();
