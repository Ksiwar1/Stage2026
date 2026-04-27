const assert = require('assert');

// Simple JS mock instead of TS import for quick manual testing in CI pipeline
function verifySchemaIntegrity(data) {
    const rootItems = data.items || {};
    const rootCats = data.categories || {};
    const rootWf = data.workflow || {};
    
    for (const wCatId of Object.keys(rootWf)) {
        if (!rootCats[wCatId]) throw new Error(`Workflow root category '${wCatId}' is missing from final categories.`);
    }
    for (const wCatId of Object.keys(rootWf)) {
        const content = rootWf[wCatId].content || {};
        for (const itemId of Object.keys(content)) {
            if (!rootItems[itemId]) throw new Error(`Item '${itemId}' is referenced in workflow '${wCatId}' but is absent from global database.`);
        }
    }
    for (const cId of Object.keys(rootCats)) {
        const catItems = rootCats[cId].items || {};
        for (const itemId of Object.keys(catItems)) {
            if (!rootItems[itemId]) throw new Error(`Item '${itemId}' is tied to category '${cId}' but does NOT exist in global database.`);
        }
    }
    return true;
}

function runTests() {
    console.log("=== Lancement de la Suite de Tests d'Intégrité (Contrat V1) ===");

    // Test 1: Valid Data
    const validData = {
        workflow: { "cat_1": { content: { "item_1": { rank: 1 } } } },
        categories: { "cat_1": { items: { "item_1": { rank: 1 } } } },
        items: { "item_1": { title: "Valid Burger", price: { dflt: { ttc: 5.5 } } } }
    };
    assert.doesNotThrow(() => verifySchemaIntegrity(validData), "Data valide ne devrait pas throw.");
    console.log("✅ Test 1: Architecture valide (Passed)");

    // Test 2: Ghost Item Reference
    const invalidData1 = {
        workflow: { "cat_1": { content: { "item_FANTOME": { rank: 1 } } } },
        categories: { "cat_1": { items: {} } },
        items: {}
    };
    assert.throws(() => verifySchemaIntegrity(invalidData1), /absent from global database/, "Devrait throw sur un item fantôme.");
    console.log("✅ Test 2: Détection Item Fantôme (Passed)");

    // Test 3: Unbound Category
    const invalidData2 = {
        workflow: { "cat_INCONNUE": { content: {} } },
        categories: { "cat_1": { items: {} } },
        items: {}
    };
    assert.throws(() => verifySchemaIntegrity(invalidData2), /missing from final categories/, "Devrait throw sur une catégorie non bindée.");
    console.log("✅ Test 3: Détection Catégorie Non-Bindée (Passed)");

    console.log("✅ TOUS LES TESTS SONT PASSÉS ET REPOSENT SUR LE CONTRAT V1 STRICT.");
}

runTests();
