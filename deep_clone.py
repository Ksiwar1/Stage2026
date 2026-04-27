import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target_block = """    // Genetic Scavenger Helper
    const cloneGeneticModifier = (modId: string, fData: any) => {
        const mod = memoryModifiers[modId];
        if (!mod) return;
        fData.modifier[modId] = { ...mod }; // Shallow copy
        
        if (mod.steps) {
            Object.keys(mod.steps).forEach(stepId => {
                const stp = memorySteps[stepId];
                if (stp) {
                    fData.steps[stepId] = { ...stp };
                    if (stp.items) {
                        Object.keys(stp.items).forEach(itemId => {
                            const itm = memoryItems[itemId];
                            if (itm) {
                                fData.items[itemId] = { ...itm };
                                // Recursive cloning for nested menus/options
                                if (itm.modifier) {
                                    cloneGeneticModifier(itm.modifier, fData);
                                }
                            }
                        });
                    }
                }
            });
        }
    };"""

new_block = """    // Genetic Scavenger Helper - DEEP CLONING AVOIDING VUE.JS UUID CRASHES
    const cloneGeneticModifier = (oldModId: string, parentItemId: string, fData: any): string | null => {
        const mod = memoryModifiers[oldModId];
        if (!mod) return null;
        
        const { randomUUID } = require("crypto");
        const newModId = randomUUID();
        
        fData.modifier[newModId] = { ...mod, "uuid-item": parentItemId, steps: {} }; 
        
        if (mod.steps) {
            Object.keys(mod.steps).forEach(oldStepId => {
                const stp = memorySteps[oldStepId];
                if (!stp) return;
                
                const newStepId = randomUUID();
                fData.modifier[newModId].steps[newStepId] = { ...mod.steps[oldStepId] }; // Conservons le rank
                fData.steps[newStepId] = { ...stp, items: {} };
                
                if (stp.items) {
                    Object.keys(stp.items).forEach(oldItemId => {
                        const itm = memoryItems[oldItemId];
                        if (!itm) return;
                        
                        const newItemId = randomUUID();
                        fData.steps[newStepId].items[newItemId] = { ...stp.items[oldItemId] }; // rank, price, default
                        fData.items[newItemId] = { ...itm }; // title, base price, img, desc
                        
                        // Si le sous-produit lui même a un parcours (ex: Un Menu qui donne une boisson qui a des Tailles)
                        if (itm.modifier) {
                            const nestedModId = cloneGeneticModifier(itm.modifier, newItemId, fData);
                            fData.items[newItemId].modifier = nestedModId;
                        }
                    });
                }
            });
        }
        return newModId;
    };"""

# We also need to update the caller!
caller_target = """            if (scavengedModifierId) {
               // Clone whole subsystem from memory pool
               cloneGeneticModifier(scavengedModifierId, finalData);
            }

            // Inject the Products (Items)"""

# Wait, the injection of products is where the parent item is created! 
# So the scavengedModifierId must be passed and cloned FOR EACH item specifically, NOT for the whole chunk generically!
# Let's inspect the entire block to rewrite it correctly.
