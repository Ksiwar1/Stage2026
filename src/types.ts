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
  idCard?: string;
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
  linkedChild?: Record<string, any>;
  linkedItems?: Record<string, any>;
  visibilityInfo?: {
    dflt?: {
      [key: string]: number[]; // Canaux numérotés
    };
    isVisible?: boolean;
    basicCompVisibility?: boolean;
  };
  isInfoModeActive?: boolean;
}

export interface ETK360Price {
  ht?: number;
  tva?: number;
  ovr?: any[];
  dflt?: number | null;
  advanced?: Record<string, any>;
  saleModeVAT?: any[];
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
  qty?: string;
  unity?: string;
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
      [key: string]: number[];
    };
    isVisible?: boolean;
    basicCompVisibility?: boolean;
  };
  stepVisibility?: {
    dflt?: {
      [key: string]: number[];
    };
    isVisible?: boolean;
    basicCompVisibility?: boolean;
  };
  type?: 'item' | 'modifier' | string;
  modifier?: string; // Gardé pour la liaison workflow
}

export interface ETK360StepItemOverride {
  rank?: number;
  price?: number;
  itemPrice?: {
    price?: Record<string, any>;
    isVisible?: boolean;
  };
  priceStep?: number;
  minChoices?: number;
  maxChoices?: number | null;
  nbrWithPrice?: number | null;
  specialPrice?: number;
  basicCompVisibility?: boolean;
  nbrWithspecialPrice?: number | null;
}

export interface ETK360Step {
  img?: string;
  msg?: {
    dflt?: {
      imp?: any[];
      nameDef?: string;
      salesSupport?: Record<string, any>;
    };
  };
  ref?: string;
  req?: boolean;
  title?: string;
  archive?: boolean;
  isBasic?: boolean;
  isComment?: boolean;
  stepItems?: Record<string, ETK360StepItemOverride>;
  maxChoices?: number;
  minChoices?: number;
  displayName?: {
    dflt?: {
      imp?: any[];
      nameDef?: string;
      salesSupport?: Record<string, any>;
    };
  };
  isModifiable?: boolean;
  nbrWithPrice?: number;
  specificOpts?: {
    isNext?: boolean;
    noButton?: boolean;
    zeroPrice?: boolean;
    isCheapest?: boolean;
    nextButton?: boolean;
    isExpensive?: boolean;
    withoutStep?: boolean;
  };
  nbrWithspecialPrice?: number;
}

export interface ETK360ModifierStepMeta {
  rank?: number;
  ovr?: Record<string, { price: number; priceStep: number }>;
  items?: Record<string, any>;
  msg?: {
    "0"?: { fr?: string; en?: string };
    "1"?: { fr?: string };
  };
}

export interface ETK360Modifier {
  title?: string;
  "uuid-item"?: string;
  steps?: Record<string, ETK360ModifierStepMeta>;
}

export interface CarteETK360 {
  opt?: Record<string, any>;
  etat?: string;
  tags?: Record<string, any>;
  color?: string;
  items?: Record<string, ETK360Item>;
  steps?: Record<string, ETK360Step>;
  title?: string;
  remark?: string;
  status?: string;
  Planning?: string;
  idEntite?: any[];
  modifier?: Record<string, ETK360Modifier>;
  operator?: string;
  shoplist?: Record<string, any>;
  workflow?: Record<string, ETK360WorkflowNode>;
  allergens?: Record<string, any>;
  isAutoRef?: boolean;
  categories?: Record<string, ETK360Category>;
  workflowList?: Record<string, any>;
  isUniqueTitle?: boolean;
  allergenGroups?: Record<string, any>;
  dateModification?: string;
  iuudCardReference?: number;
  theme?: ETK360Theme;
}
