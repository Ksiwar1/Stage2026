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
        }
    }
    return true;
}
