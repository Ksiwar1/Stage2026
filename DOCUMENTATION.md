# 📚 Architecture et Documentation du Générateur ETK360

Ce document a pour but de vous aider à comprendre comment fonctionne le code que nous avons écrit. Le projet est séparé en trois grandes parties qui communiquent entre elles :

1. **La Base de données (PostgreSQL)** : Contient les anciennes cartes ETK360.
2. **Le Générateur IA (`genererCarteAction.ts`)** : Le "Cerveau" qui lit l'ancienne carte et fusionne les données avec l'IA.
3. **L'Interface Utilisateur (`KioskSimulator.tsx`)** : L'écran interactif de la borne qui affiche le menu.

---

## 1. 🧠 Le Générateur IA (`src/app/actions/genererCarteAction.ts`)

Ce fichier est le plus complexe. C'est lui qui s'exécute quand vous cliquez sur le bouton "Générer la carte".
Il agit comme un traducteur intelligent entre ce que l'Intelligence Artificielle invente et la structure très stricte de votre base de données ETK360.

### Les 4 étapes clés du générateur :
1. **Construction de la Mémoire (`memoryItems`)** : 
   Le script commence par lire la carte d'origine (ex: `carte2_o3k`). Il "aplatit" tous les produits, options et modificateurs dans un grand dictionnaire appelé `memoryItems`. Grâce à ça, le script connaît tous les anciens prix et toutes les anciennes T.V.A.
   
2. **Appel à Gemini (L'IA)** : 
   Le script envoie votre consigne (ou la photo du menu papier) à Google Gemini. Gemini renvoie une structure JSON contenant les catégories et produits qu'il a compris ou inventés.

3. **L'Algorithme de Fusion (Le Clonage)** :
   C'est la partie critique (`buildNativeModifierFromAiSteps`). Quand l'IA donne une option (ex: "NEMS CREVETTES 3 PCS"), le script cherche ce nom dans `memoryItems`. S'il le trouve, **il clone le vrai objet de la base de données** (avec son vrai prix et sa TVA). S'il ne le trouve pas, il crée un nouvel objet (halluciné) avec un prix par défaut de 0€.

4. **Le Fallback Tarifaire (Correction des 0€)** :
   Si l'IA crée un produit qui est censé être une "catégorie" gratuite (ex: BORAQ ou BOITES) dont le prix de base est 0€, le script va automatiquement chercher le prix "standalone" (individuel) de l'option dans la base de données pour éviter que les options ne s'affichent à 0€ dans le récapitulatif.

---

## 2. 🔌 Le Traducteur (`src/lib/softaveraParser.ts`)

La base de données ETK360 stocke les menus sous forme d'une toile d'araignée très complexe (Graph) avec des ID partout. L'interface visuelle React ne peut pas lire ça facilement.
Le fichier `softaveraParser.ts` sert de traducteur universel.

- `parseETK360Hierarchy` : Prend le chaos de la base de données et le transforme en un "Arbre" propre (Catégories ➡️ Sous-catégories ➡️ Produits).
- `extractBestPrice` : Le système de prix d'ETK360 est très tordu. Un prix peut se cacher dans `price.dflt`, ou dans des grilles horaires avancées (`price.advanced`). Cette fonction s'assure d'extraire toujours le bon prix (TTC), même si le produit est vendu à 0€ par défaut mais possède un prix spécifique pour le mode "Kiosk" (Borne).

---

## 3. 🖥️ L'Interface Borne (`src/components/KioskSimulator.tsx`)

C'est le fichier qui gère tout ce que vous voyez à l'écran : les boutons, les images, le panier, les popups.

### Composants principaux :
- **Le Workflow (Modificateurs)** : Quand vous cliquez sur un menu (ex: "DOUBLE ORIGINAL SMASH MENU"), le simulateur lit les étapes (`steps`) générées par le parser. Il affiche alors des fenêtres successives : "Choix Boisson", "Choix Frites".
- **Le Panier (`calculateCurrentProductTotal`)** : À chaque fois que vous sélectionnez une option, le script navigue dans vos choix et additionne les prix (`priceTTC` du produit + `priceDelta` des options) pour afficher le Total en direct. Les prix exactement égaux à 0 sont masqués pour ne pas polluer l'interface visuelle.

> **💡 Conseil pour l'avenir :**
> Si jamais vous constatez qu'un prix ne s'affiche pas correctement sur la borne générée, le problème se situe très souvent dans la fonction `buildNativeModifierFromAiSteps` du `genererCarteAction.ts`. C'est là que l'IA tente de faire correspondre un nom inventé avec le vrai nom de la base de données.
