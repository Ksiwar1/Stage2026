const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/generer-carte/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The block to remove is from `<p style={{ textAlign: 'center', margin: '0.5rem 0'...` down to `</select>`
// Basically lines 219 to 245
const startRemove = content.indexOf("<p style={{ textAlign: 'center', margin: '0.5rem 0'");
const endRemove = content.indexOf("</select>", startRemove) + "</select>".length;

let newContent = content.substring(0, startRemove) + content.substring(endRemove);

// Now, the `) : (` which separates activeTab === "libre" from the wizard logic
// We want to remove the JSX ternary `activeTab === "libre" ? ( <> ... </> ) : ( ... )`
// And instead do:
// {activeTab === "libre" && ( <> ... Image preview ... </> )}
// { /* Wizard */ <div style={{ background: '#ffffff' ...> ... </div> }

newContent = newContent.replace(
    `{activeTab === "libre" ? (`, 
    `{activeTab === "libre" && (`
);

newContent = newContent.replace(
    `</>\n          ) : (`, 
    `</>\n          )}\n\n          {true && (`
);

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log("Patched successfully");
