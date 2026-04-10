const fs = require('fs');

function parseETK360HierarchyAST(data) {
    if (!data || !data.workflow || !data.categories || !data.items) return [];

    const tree = [];
    const rootWorkflowIds = Object.keys(data.workflow);

    for (const wNodeId of rootWorkflowIds) {
        const wNode = data.workflow[wNodeId];
        if (wNode.type !== 'categories') continue;
        
        const catObj = data.categories[wNodeId];
        if (!catObj) continue;
        if (catObj.archive === true || catObj.isVisible === false) continue;
        if (catObj.visibilityInfo?.isVisible === false) continue;

        let title = catObj.title || catObj.name || (catObj.displayName?.dflt?.nameDef) || "Catégorie";
        let image = catObj.img?.dflt?.img || catObj.img?.url || null;
        if (image === "https://beta-catalogue.etk360.com/no-pictures.svg") image = null;

        const category = {
            id: wNodeId,
            title,
            image,
            products: [],
            workflowRank: wNode.rank || 0
        };

        const contentKeys = Object.keys(wNode.content || {});
        const itemNodes = contentKeys.map(k => ({ id: k, ...wNode.content[k] })).filter(n => n.type === 'items');
        itemNodes.sort((a, b) => (a.rank || 0) - (b.rank || 0));

        for (const iNode of itemNodes) {
            const itemObj = data.items[iNode.id];
            if (!itemObj) continue;
            if (itemObj.archive === true || itemObj.isVisible === false) continue;

            const name = itemObj.displayName?.dflt?.nameDef || itemObj.title || itemObj.name || "Inconnu";
            let priceTTC = 0;
            if (typeof itemObj.price?.ttc === 'number') priceTTC = itemObj.price.ttc;
            else if (typeof itemObj.price?.dflt === 'number') priceTTC = itemObj.price.dflt;

            let img = itemObj.img?.dflt?.img || itemObj.img?.url || null;
            if (img === "https://beta-catalogue.etk360.com/no-pictures.svg") img = null;

            // Chercher le modifier dans le contenu workflow de l'item
            const itemContentKeys = Object.keys(iNode.content || {});
            const modNodes = itemContentKeys.map(k => ({ id: k, ...iNode.content[k] })).filter(n => n.type === 'modifier');
            let modifierId = modNodes.length > 0 ? modNodes[0].id : itemObj.modifier;

            category.products.push({
                id: iNode.id,
                name,
                priceTTC,
                image: img,
                description: itemObj.description || '',
                steps: [],
                modifierId: modifierId,
            });
        }

        if (category.products.length > 0) tree.push(category);
    }
    
    tree.sort((a, b) => a.workflowRank - b.workflowRank);
    return tree;
}

const data = JSON.parse(fs.readFileSync('./.softavera/carte/3_1775635565040.json', 'utf8'));
const tree = parseETK360HierarchyAST(data);
console.log('Categories built:', tree.length);
if (tree.length > 0) console.log('Products in first cat:', tree[0].products.length, tree[0].products[0]);
