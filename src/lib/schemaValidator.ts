export function verifySchemaIntegrity(data: any): boolean {
    const rootItems = data.items || {};
    const rootCats = data.categories || {};
    const rootWf = data.workflow || {};
    
    // Check 1: Workflow roots must exist in Categories
    for (const wCatId of Object.keys(rootWf)) {
        if (!rootCats[wCatId]) {
            throw new Error(`Workflow root category '${wCatId}' is missing from final categories.`);
        }
    }
    
    // Check 2: All items referenced in workflow MUST exist in global items, and rank collisions
    for (const wCatId of Object.keys(rootWf)) {
        const content = rootWf[wCatId].content || {};
        const ranks = new Set();
        
        for (const itemId of Object.keys(content)) {
            if (!rootItems[itemId]) {
                throw new Error(`Item '${itemId}' is referenced in workflow '${wCatId}' but is totally absent from global database.`);
            }
            const r = content[itemId].rank;
            if (r !== undefined && r !== null) {
                if (ranks.has(r)) {
                    console.warn(`[INTEGRITY] Rank Collision in '${wCatId}': rank ${r}. ETK360 might sort them alphabetically.`); 
                }
                ranks.add(r);
            }
        return true;
    }
    
    // Check 3: Categories Dual Binding Check
    for (const cId of Object.keys(rootCats)) {
        const catItems = rootCats[cId].items;
        if (Array.isArray(catItems)) {
            for (const itemId of catItems) {
                if (typeof itemId === 'string' && !rootItems[itemId]) {
                    throw new Error(`Item '${itemId}' is tied to category '${cId}' but does NOT exist in global database.`);
                }
            }
        } else if (catItems && typeof catItems === 'object') {
            for (const itemId of Object.keys(catItems)) {
                if (!rootItems[itemId]) {
                    throw new Error(`Item '${itemId}' is tied to category '${cId}' but does NOT exist in global database.`);
                }
            }
        }
    }
    return true;
}
