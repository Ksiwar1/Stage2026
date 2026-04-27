const fs = require('fs');
let content = fs.readFileSync('src/app/actions/genererCarteAction.ts', 'utf8');
content = content.replace(
    '    \n    architectureJson = architectureJson.replace(/```json/gi, "").replace(/```/g, "").trim();',
    '    let architectureJson = await generateAIResponse(promptSysteme1, promptUtilisateur1, 0.7, aiType, base64Image, 1000);\n    architectureJson = architectureJson.replace(/```json/gi, "").replace(/```/g, "").trim();'
);
fs.writeFileSync('src/app/actions/genererCarteAction.ts', content);
