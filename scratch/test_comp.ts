import { cardService } from '../src/services/cardService';

async function test() {
  const cards = await cardService.getAllCards();
  console.log("Total cards:", cards.length);
  if (cards.length === 0) return;
  
  let foundBasicCompCount = 0;
  let missingItemsCount = 0;
  
  for (const card of cards) {
     const content = card.content;
     if (!content || !content.items) continue;
     const items = content.items;
     
     for (const itemId in items) {
        const item = items[itemId];
        if (item.basicComp && Object.keys(item.basicComp).length > 0) {
           for (const ingId in item.basicComp) {
              foundBasicCompCount++;
              if (!items[ingId]) {
                 missingItemsCount++;
                 console.log(`Missing ingId ${ingId} in card ${card.id} (Store: ${card.store_name})`);
              }
           }
        }
     }
  }
  console.log(`Found ${foundBasicCompCount} basicComp entries. Missing items: ${missingItemsCount}`);
}
test().catch(console.error);
