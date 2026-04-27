const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/generer-carte/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const oldState = `  const [wizardData, setWizardData] = useState({
    restaurantName: "",
    theme: "",
    typeLabel: "",
    categories: [] as string[],
    structure: "produits",
    options: [] as string[],
    palette: ""
  });`;

const newState = `  const [wizardData, setWizardData] = useState({
    restaurantName: "",
    theme: "",
    typeLabel: "",
    language: "Français",
    productCountLimit: "3-5",
    categories: [] as string[],
    customCategory: "",
    visualStyle: "Moderne",
    visualTheme: "Coloré",
    primaryColor: "#4f46e5",
    secondaryColor: "#10b981",
    productSizes: "Aucune",
    productSupplements: [] as string[],
    productBadges: [] as string[],
    showAllergens: true,
    outputFormat: "Écran kiosque",
    navigationType: "Parcours guidé",
    structure: "produits",
    options: [] as string[],
    palette: ""
  });`;

if (content.includes(oldState)) {
    content = content.replace(oldState, newState);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("State updated");
} else {
    console.log("old state not found");
}
