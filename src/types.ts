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
  id: number | string;
  img?: {
    dflt: {
      img: string;
      salesSupport?: any;
    };
  };
  ref?: string;
  rank?: number;
  child?: any[];
  color?: string;
  items?: string[] | Record<string, any>; // Supporte les array d'UUIDs ou l'ancien format
  title: string;
  video?: {
    url: string;
    type: string;
  };
  idCard?: number | any[];
  parent?: string;
  archive?: boolean;
  liaison?: any[];
  isNameShow?: boolean;
  linkedTags?: any[];
  description?: {
    dflt?: {
      imp?: any;
      nameDef?: string;
      salesSupport?: any;
    };
  };
  displayName?: {
    dflt?: {
      imp?: any;
      nameDef?: string;
      salesSupport?: any;
      [key: string]: any; // Pour les canaux multilingues FR/EN
    };
  };
  linkedChild?: any[];
  linkedItems?: any[];
  visibilityInfo?: {
    dflt?: {
      isVisible?: boolean;
      basicCompVisibility?: boolean;
      [key: number]: number[]; // Canaux numérotés
    };
  };
  isInfoModeActive?: boolean;
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
  id: string; // Gardé pour la clé canonique
  fid?: number;
  img?: {
    dflt: {
      img: string;
      salesSupport?: any;
    };
  };
  opt?: Record<string, any>;
  ref?: string;
  menu?: Record<string, any>;
  rank?: number;
  unit?: Record<string, any>;
  color?: string;
  offer?: Record<string, any>;
  price?: any;
  steps?: any[];
  title: string;
  parent?: string;
  prSize?: number;
  archive?: boolean;
  barCode?: string;
  extrRef?: string;
  liaison?: any[];
  calories?: number;
  outStock?: boolean;
  printers?: any[];
  sizeList?: any[];
  suspSale?: any[];
  variants?: any[];
  allergens?: any[];
  basicComp?: Record<string, any>;
  isComment?: boolean;
  active_qty?: boolean;
  isRedirect?: boolean;
  linkedTags?: any[];
  nutriScore?: Record<string, any>;
  description?: {
    dflt?: {
      imp?: any;
      nameDef?: string;
      salesSupport?: any;
      [key: string]: any;
    };
  };
  displayName?: {
    dflt?: {
      imp?: any;
      nameDef?: string;
      salesSupport?: any;
      [key: string]: any;
    };
  };
  isTitleShow?: boolean;
  creationType?: string;
  isOptionChoice?: boolean;
  visibilityInfo?: {
    dflt?: {
      isVisible?: boolean;
      basicCompVisibility?: boolean;
      [key: number]: number[];
    };
  };
  stepVisibility?: {
    dflt?: {
      isVisible?: boolean;
      basicCompVisibility?: boolean;
      [key: number]: number[];
    };
  };
  type?: 'item' | 'modifier' | string;
  modifier?: string; // Gardé pour la liaison workflow
}

export interface ETK360StepItemOverride {
  rank: number;
  priceStep: number;
  maxChoices: number;
  minChoices: number;
  itemPrice?: Record<string, any>;
  nbrWithPrice?: number;
}

export interface ETK360Step {
  id: number;
  ref: string;
  req?: boolean;
  title: string;
  archive?: boolean;
  isBasic?: boolean;
  isComment?: boolean;
  stepItems: Record<string, ETK360StepItemOverride>;
  maxChoices: number;
  minChoices: number;
  displayName?: {
    dflt?: {
      imp?: any;
      nameDef?: string;
      salesSupport?: any;
      [key: string]: any;
    };
  };
  isModifiable?: boolean;
  nbrWithPrice?: number;
  specificOpts?: Record<string, any>;
  nbrWithspecialPrice?: number;
  img?: ETK360Image; // Kept for backwards compatibility if any
  rank?: number;     // Kept for backwards compatibility if any
}

export interface ETK360ModifierStepMeta {
  rank?: number;
}

export interface ETK360Modifier {
  title?: string;
  "uuid-item"?: string;
  steps?: Record<string, ETK360ModifierStepMeta>;
}

export interface ETK360Catalogue {
  title?: string;
  theme?: ETK360Theme;
  opt?: Record<string, any>;
  etat?: string; // ex: "En attente"
  tags?: Record<string, any>;
  color?: string;
  workflow: Record<string, ETK360WorkflowNode>;
  categories: Record<string, ETK360Category>;
  items: Record<string, ETK360Item>;
  modifier?: Record<string, ETK360Modifier>;
  steps?: Record<string, ETK360Step>;
}
