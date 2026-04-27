const { randomUUID } = require("crypto");

function createETK360FromSimpleJson(simpleJson) {
   const data = {
       theme: { palette: simpleJson.themePalette || ["#4F46E5", "#10B981", "#F59E0B"] },
       workflow: {},
       categories: {},
       items: {},
       modifier: {},
       steps: {}
   };
   
   let rankCat = 1;
   for (const cat of simpleJson.categories) {
       const catId = randomUUID();
       data.categories[catId] = { title: cat.name, isVisible: true, color: data.theme.palette[0] };
       
       const content = {};
       let rankItem = 1;
       for (const item of cat.items) {
           const itemId = randomUUID();
           data.items[itemId] = {
               type: "items",
               title: item.name,
               price: { dflt: { ttc: item.price || 10.0 } },
               img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodeURIComponent(item.name.replace(/ /g, '_'))}` } },
               id: Math.floor(Math.random() * 1000)
           };
           content[itemId] = { type: "items", rank: rankItem++ };
       }
       
       data.workflow[catId] = { type: "categories", rank: rankCat++, content };
   }
   return data;
}
console.log(createETK360FromSimpleJson({ categories: [{ name: "Pizzas", items: [{ name: "Marga", price: 12}] }] }));
