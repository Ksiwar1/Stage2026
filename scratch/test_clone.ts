import { readFileSync } from 'fs';
const baseTemplate = readFileSync('src/lib/template_reference_ia.json', 'utf8');
const data = JSON.parse(baseTemplate);
let finalData: any = { workflow: {}, categories: {}, items: {}, modifier: {}, steps: {} };

Object.keys(data).forEach(key => {
    if (!['workflow', 'categories', 'items', 'modifier', 'steps', 'theme', 'title'].includes(key)) {
        finalData[key] = JSON.parse(JSON.stringify(data[key]));
    }
});
console.log("Allergens copied:", finalData.allergens);
console.log("Shoplist copied:", finalData.shoplist);
