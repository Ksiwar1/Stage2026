# Principe du parcours produit (borne)

Ce document explique **comment un client traverse un produit** sur la borne, de la
liste jusqu'au panier. Il décrit le *principe* (le fonctionnement), pas le code.

---

## 1. Vue d'ensemble

```
Accueil (sur place / à emporter)
        ↓
Liste : catégories (gauche) → produits (grille 2 colonnes)
        ↓
Carte produit ──[ i ]──► Modale d'information (lecture seule)
        │
        ├─ produit SIMPLE  → ajout direct au panier (toast « ajouté »)
        └─ produit COMPOSÉ → ouverture du TUNNEL de personnalisation
                                    ↓
                         Étape 1 → Étape 2 → … (choix)
                                    ↓
                         Récapitulatif → Ajout au panier
                                    ↓
                         Barre panier → Payer
```

---

## 2. Les deux types de produits

Un produit est **composé** s'il possède au moins une étape de personnalisation
(`steps`), **simple** sinon.

| Type | Dans la liste | Au clic |
|------|---------------|---------|
| **Simple** (sans étape) | image + nom + **prix** | ajouté direct au panier |
| **Composé** (avec étapes) | image + nom (**pas de prix**, car il dépend des choix) | ouvre le **tunnel** |

> Le prix d'un produit composé n'est pas affiché dans la liste : il se construit
> au fil des choix. Le détail reste consultable via le bouton **« i »**.

---

## 3. La modale d'information (bouton « i »)

Accessible sur chaque carte produit. **Lecture seule** : elle montre tout sans
rien ajouter au panier.
- Image, nom, prix (ou badge **« Menu personnalisable »** pour un composé).
- Description (ex. *« Disponible seulement le samedi et dimanche de 11h30 à 16h30 »*).
- L'arbre complet de personnalisation (étapes → options → sous-étapes).
- Un bouton **« Composer / + Ajouter »** qui lance le vrai parcours.

---

## 4. Le tunnel d'un produit composé

C'est le cœur du parcours. Le client avance **étape par étape**.

### 4.1 Structure d'une étape
Chaque étape pose **une question** et propose des **options** :
- un **titre** (ex. `COMPOSITION`, `CHOIX BOISSON`, `CHOIX BURGER`) ;
- une **contrainte de choix** `min–max` :
  - `0–1` : facultatif, un seul possible ;
  - `1–1` : un choix obligatoire ;
  - `0–2` : jusqu'à deux ;
- des **options**, chacune avec éventuellement un **surcoût** (`+x,xx €`) et un
  marqueur **obligatoire**.

### 4.2 Les natures d'étapes
La borne reconnaît le *sens* de chaque étape pour adapter l'affichage :
`COMPOSITION` (retrait d'ingrédients), `TAILLE`, `SAUCES`, `BOISSON`,
`DESSERT`, `EXTRAS`, `OPTION_GLOBALE`.

- **Composition** : les ingrédients sont **pré-cochés** ; le client *retire* ce
  qu'il ne veut pas (« Souhaitez-vous retirer un ingrédient ? »).
- Les autres étapes : le client *ajoute* / *choisit*.

### 4.3 Les sous-parcours (produits composés imbriqués)
Une option peut elle-même être un produit composé : la choisir **empile un
niveau** et ouvre son propre mini-parcours, puis on revient au niveau parent.
C'est ce qui permet les **menus** (un menu contient un burger qui a lui-même sa
composition, une boisson, un dessert…).

### 4.4 Navigation et prix
- Boutons **Précédent / Suivant** ; un fil d'Ariane rappelle où on est
  (`HOT DOGS / COMPOSITION`).
- **Prix final** = prix de base du produit **+** somme des surcoûts des options
  retenues (à tous les niveaux).
- À la fin : **récapitulatif** des choix, puis **ajout au panier**.

---

## 5. Exemples réels (carte FA2L RESTAURATION)

### HOT DOGS (produit composé)
1. **Composition** *(0–1)* — retirer un ingrédient : Sauce moutarde, Saucisse de
   volaille, Oignons frits, Ketchup…
2. **Choix entrée / appetizers** *(choix imposé)* — frites, sticks, bouchées…

### AMERICAN BRUNCH (menu, plusieurs formules)
- **Formule 3** → Choix jus *(0–1)* · Choix boisson *(0–1)*
- **Formule 1** → Choix burger *(0–1)* → **Composition** *(0–2)* · Choix dessert *(0–1)*

Chaque « Choix … » est une étape ; chaque burger choisi ouvre un **sous-parcours**
(sa composition). Le prix se cumule au fur et à mesure.

---

## 6. Fin de parcours

- Le produit configuré est ajouté au **panier** (compteur + total).
- Une **barre panier flottante** affiche `N article(s)` et le **total à payer**.
- Le client peut continuer ses achats ou valider le paiement.

---

## 7. Résumé en une phrase

Le parcours = **catégorie → produit → (info « i » optionnelle) → ajout direct si
simple, sinon tunnel d'étapes (avec sous-parcours pour les menus) → récapitulatif
→ panier**, le prix se construisant à chaque choix.
