# RÉFÉRENCE ABSOLUE : SCHÉMA ETK360 (NATIVE)

Ce document établit la **Source de Vérité d'Architecture** du format natif ETK360. 
Toute génération, manipulation ou extraction de carte doit **strictement** conserver cette anatomie exhaustive, sans aucune "purification" ou simplification de propriétés.

> [!IMPORTANT]
> **Règles Universelles du Schéma :**
> - **Identifiants** : Tous les IDs primaires sont des `UUIDs` (à l'exception de propriétés spécifiques signalées).
> - **Visibilité (`visibilityInfo` / `stepVisibility`)** : Le contrôle d'affichage s'opère par "Canal de vente" (1, 2, 3...) contenant des tableaux de créneaux horaires. `isVisible` agit comme switch maître.
> - **Multilingue (`displayName.dflt.salestSupport`)** : Ces objets gèrent le "Custom Labeling" multilingue (FR/EN) ciblé par canal de vente.
> - **Tri (`rank`)** : Seul ce Number dicte l'ordre positionnel d'affichage d'un élément UI.
> - **Destruction Douce (`archive`)** : La valeur `true` supprime l'élément du rendu client/borne. Ne jamais détruire physiquement le noeud du JSON.

---

## 🔹 RACINE (Catalogue Intégral)
Représente l'état global du point de vente et l'organigramme de conception.

- `opt` *(object)* : Dictionnaire d'options (indexé par UUID)
- `etat` *(string)* : Statut logiciel (ex: "En attente")
- `tags` *(object)* : Méta-regroupements divers
- `color` *(string)* : Thème maître Hexa
- `items` *(object)* : Dictionnaire UUID des produits 
- `steps` *(object)* : Dictionnaire UUID des étapes/choix
- `title` *(string)* : Nom de l'établissement / la carte
- `remark` *(string)* : Note interne 
- `status` *(string)*
- `Planning` *(string)*
- `idEntite` *(array)*
- `modifier` *(object)* : Arborescence des modificateurs de commande
- `operator` *(string)* : Nom de l'administrateur
- `shoplist` *(object indexé par UUID)*
- `workflow` *(object)* : Squelette hiérarchique du menu (Categories > Items)
- `allergens` *(object)*
- `isAutoRef` *(boolean)*
- `categories` *(object)* : Dictionnaire UUID des catégories
- `workflowList` *(object)*
- `isUniqueTitle` *(boolean)*
- `allergenGroups` *(object)*
- `dateModification` *(string)* : Date de publication canonique
- `iuudCardReference` *(number)*

---

## 🔹 CATÉGORIES (Categories - indexées UUID)
- `id` *(number/string)*
- `img` *(object)* : `dflt` > `img` (string URL) + `salesSupport` (object) 
- `ref` *(string)*
- `rank` *(number)*
- `child` *(array)*
- `color` *(string)*
- `items` *(array)* : Identifiants UUID ou historique
- `title` *(string)*
- `video` *(object)* : `url` + `type`
- `idCard` *(number | array)*
- `parent` *(string UUID)*
- `archive` *(boolean)*
- `liaison` *(array)*
- `isNameShow` *(boolean)*
- `linkedTags` *(array)*
- `description` *(object)* : `dflt` > `imp`, `nameDef`, `salesSupport`
- `displayName` *(object)* : `dflt` > `imp`, `nameDef`, `salesSupport multilingue FR/EN par canal de vente`
- `linkedChild` *(array)*
- `linkedItems` *(array)*
- `visibilityInfo` *(object)* : `dflt` > canaux numérotés avec arrays de créneaux, `isVisible`, `basicCompVisibility`
- `isInfoModeActive` *(boolean)*

---

## 🔹 PRODUITS (Items - indexés UUID)
- `fid` *(number)*
- `img` *(object)* : `dflt` > `img` + `salesSupport`
- `opt` *(object)*
- `ref` *(string)*
- `menu` *(object)*
- `rank` *(number)*
- `unit` *(object)*
- `color` *(string)*
- `offer` *(object)*
- `price` *(object)* : Architecture de prix canonique (`dflt` > `ttc`, `tx`)
- `steps` *(array)*
- `title` *(string)*
- `parent` *(string UUID)*
- `prSize` *(number)*
- `archive` *(boolean)*
- `barCode` *(string)*
- `extrRef` *(string)*
- `liaison` *(array)*
- `calories` *(number)*
- `outStock` *(boolean)*
- `printers` *(array)*
- `sizeList` *(array)*
- `suspSale` *(array)*
- `variants` *(array)*
- `allergens` *(array)*
- `basicComp` *(object)*
- `isComment` *(boolean)*
- `active_qty` *(boolean)*
- `isRedirect` *(boolean)*
- `linkedTags` *(array)*
- `nutriScore` *(object)*
- `description` *(object)* : `dflt` > `imp`, `nameDef`, `salesSupport multilingue`
- `displayName` *(object)* : `dflt` > `imp`, `nameDef`, `salesSupport multilingue`
- `isTitleShow` *(boolean)*
- `creationType` *(string)*
- `isOptionChoice` *(boolean)*
- `visibilityInfo` *(object)* : Mêmes structures que Catégories
- `stepVisibility` *(object)* : Mêmes règles de visibilité par canal et créneau

---

## 🔹 ÉTAPES (Steps - indexées UUID)
- `id` *(number)*
- `ref` *(string UUID)*
- `req` *(boolean)* : Choix obligatoire
- `title` *(string)*
- `archive` *(boolean)*
- `isBasic` *(boolean)*
- `isComment` *(boolean)*
- `stepItems` *(object)* : Dictionnaire contenant les UUID items enfants ainsi que leur surcharge de prix
- `maxChoices` *(number)*
- `minChoices` *(number)*
- `displayName` *(object)* : Config multilingue habituelle
- `isModifiable` *(boolean)*
- `nbrWithPrice` *(number)*
- `specificOpts` *(object)*
- `nbrWithspecialPrice` *(number)*

---

## 🔹 OPTIONS (Opt - indexées UUID)
- `title` *(string)*
- `values` *(object)*
- `archive` *(boolean)*
- `displayName` *(object)* : Config multilingue habituelle
- `defaultValue` *(string)*
- `isUniqueTitle` *(boolean)*
