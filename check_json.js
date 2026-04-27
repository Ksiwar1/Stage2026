const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.softavera/carte/ia_time_square_.json'));
console.log("Categories:", Object.values(data.categories || {}).map(c => c.title));
const firstItemKeys = Object.keys(data.items || {}).slice(0, 5);
console.log("First Items:", firstItemKeys.map(k => data.items[k].title));
