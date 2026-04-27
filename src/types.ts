// src/types.ts

/**
 * STRUCTURE OFFICIELLE DU CATALOGUE ETK360
 * Ce fichier centralise le typage exhaustif de la structure relationnelle plate.
 */

export interface ETK360Theme {
  palette: string[];
}

export interface ETK360WorkflowNode {
  type: 'categories' | 'items' | 'workflow';
  rank: number;
  content?: Record<string, ETK360WorkflowNode>;
  modifier?: string;
}

export interface ETK360Category {
  id: string;
  title: string;
  isVisible: boolean;
  rank: number;
  items: Record<string, any>;
  child?: Record<string, any>;
  color?: string;
  image?: string;
}

export interface ETK360Price {
  dflt?: {
    tx?: number;
    ttc?: number | null; // Distinction stricte entre manquant (null) et gratuit (0)
  } | number | null;
}

export interface ETK360Image {
  dflt?: {
    img: string;
  };
  url?: string;
}

export interface ETK360IngredientMeta {
  isObligatory?: boolean;
  rank?: number;
  isVisible?: boolean;
}

export interface ETK360Item {
  id: string;                      // Identifiant canonique
  ref?: string;                    // Référence SKU métier
  type: 'item' | 'modifier';       // Typologie stricte
  title: string;                   // Nom du produit
  description?: string;            // Description formatée string
  price: ETK360Price;              // Arborescence de tarification stricte
  img?: ETK360Image;               // Conteneur d'image minimaliste
  modifier?: string;               // Relation pure ID (lien vers un sous-tunnel)
  basicComp?: Record<string, ETK360IngredientMeta>; // Options exclusives composant la structure métier brute
  isVisible?: boolean;             // L'état de publication en base de donnée
}

export interface ETK360StepItemOverride {
  rank: number;
  priceStep: number; // Surcharge locale du prix d'une option
  maxChoices: number;
  minChoices: number;
  itemPrice?: Record<string, any>;
  nbrWithPrice?: number;
}

export interface ETK360Step {
  id: number | string;
  ref: string;
  title: string;
  archive: boolean;
  isBasic: boolean;
  isComment: boolean;
  stepItems: Record<string, ETK360StepItemOverride>;
  maxChoices: number;
  minChoices: number;
  displayName: { dflt: { imp: any[]; nameDef: string; salesSupport: any } };
  isModifiable: boolean;
  specificOpts: Record<string, any>;
  img: ETK360Image;
  rank: number;
}

export interface ETK360ModifierStepMeta {
  rank?: number;
}

export interface ETK360Modifier {
  title?: string;
  "uuid-item"?: string; // Relation historique (Legacy)
  steps?: Record<string, ETK360ModifierStepMeta>;
}

export interface ETK360Catalogue {
  title?: string;
  theme?: ETK360Theme;
  workflow: Record<string, ETK360WorkflowNode>;
  categories: Record<string, ETK360Category>;
  items: Record<string, ETK360Item>;
  modifier?: Record<string, ETK360Modifier>;
  steps?: Record<string, ETK360Step>;
}
