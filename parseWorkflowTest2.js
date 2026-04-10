const fs = require('fs');
const d = JSON.parse(fs.readFileSync('./.softavera/carte/3_1775635565040.json', 'utf8'));

// Quel est le nom du modifier '668af698-5c47-59f2-8a01-181f63589fc0' (PR CH 3's modifier)?
const mod = d.modifier['668af698-5c47-59f2-8a01-181f63589fc0'];
console.log('PR CH 3 modifier (668af698) steps:', mod ? Object.keys(mod.steps) : 'not found');
if (mod) {
    const steps = Object.keys(mod.steps);
    for (const s of steps) {
        const stepDef = d.opt[s] || d.steps[s];
        console.log('Step', s, 'title:', stepDef?.title);
        const itemIds = mod.steps[s].items ? Object.keys(mod.steps[s].items) : [];
        console.log('  Items:', itemIds.map(i => d.items[i]?.title || i).join(', '));
    }
}

// Cherchons les etapes contenant 'composition de base'
let compId = null;
let boissonId = null;
Object.entries(d.opt || {}).forEach(([k, v]) => {
    if (v.title === 'composition de base') compId = k;
    if (v.title === 'BOISSONS_NZKO') boissonId = k;
});
if (!compId) {
    Object.entries(d.steps || {}).forEach(([k, v]) => {
        if (v.title === 'composition de base') compId = k;
        if (v.title === 'BOISSONS_NZKO') boissonId = k;
    });
}
console.log('Found compId:', compId, 'boissonId:', boissonId);

// Cherchons si un modifier contient ces étapes
Object.entries(d.modifier || {}).forEach(([modId, modObj]) => {
   if (modObj.steps && (modObj.steps[compId] || modObj.steps[boissonId])) {
       console.log('Modifier', modId, 'contains these steps!');
   }
});
