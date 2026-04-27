'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type SupportedLang = 'FR' | 'EN';

const dictionary: Record<string, Record<SupportedLang, string>> = {
  // Navigation
  "nav_home": { FR: "Accueil", EN: "Home" },
  "nav_dashboard": { FR: "Tableau de bord", EN: "Dashboard" },
  
  // Dashboard / Menu Page
  "dashboard_title": { FR: "Tableau de bord", EN: "Dashboard" },
  "dashboard_desc": { FR: "Accédez directement aux différentes fonctionnalités de votre application depuis votre centre de contrôle dynamique.", EN: "Directly access the various features of your application from your dynamic control center." },
  
  "card_generate_title": { FR: "Générer une carte", EN: "Generate a menu" },
  "card_generate_desc": { FR: "Module intuitif pour configurer et créer de nouvelles cartes personnalisées dans le système.", EN: "Intuitive module to configure and create new personalized menus in the system." },
  
  "card_library_title": { FR: "Bibliothèque", EN: "Library" },
  "card_library_desc": { FR: "Consultez l'ensemble de vos cartes existantes, gérez vos archives de manière simplifiée.", EN: "View all your existing menus, manage your archives in a simplified way." },
  
  "card_import_title": { FR: "Importer des cartes", EN: "Import menus" },
  "card_import_desc": { FR: "Upload de base de données : intégration en masse de cartes via fichiers CSV ou Excel.", EN: "Database upload: mass integration of menus via CSV or Excel files." },
  
  "card_update_title": { FR: "Update Carte", EN: "Update Menu" },
  "card_update_desc": { FR: "Interface pour mettre à jour instantanément les informations et modifier le statut de vos cartes.", EN: "Interface to instantly update information and modify the status of your menus." },
  
  "card_history_title": { FR: "Historique", EN: "History" },
  "card_history_desc": { FR: "Retrouvez et auditez toutes les traces d'activité, les logs, et les opérations générées.", EN: "Find and audit all activity trails, logs, and generated operations." },
  
  "card_settings_title": { FR: "Paramètres", EN: "Settings" },
  "card_settings_desc": { FR: "Gérez vos préférences utilisateurs, votre identité visuelle, et la configuration de l'application.", EN: "Manage your user preferences, visual identity, and application configuration." },
  
  // Home Page
  "home_welcome": { FR: "Bienvenue", EN: "Welcome" },
  "home_desc": { FR: "Cartes Softavera", EN: "Softavera Menus" },
  
  // Generator Page
  "gen_title": { FR: "Générateur de cartes", EN: "Menu Generator" },
  "gen_desc": { FR: "L'Intelligence Artificielle est connectée à vos cartes. Tapez un sujet et laissez la magie opérer.", EN: "Artificial Intelligence is connected to your menus. Type a subject and let the magic happen." },
  "gen_step1": { FR: "Concept", EN: "Concept" },
  "gen_step2": { FR: "Composition", EN: "Composition" },
  "gen_step3": { FR: "Structure", EN: "Structure" },
  "gen_step4": { FR: "Technique", EN: "Technical" },
  "gen_step5": { FR: "Finalisation", EN: "Finalization" },
  "gen_back": { FR: "← Retour", EN: "← Back" },
  "gen_continue": { FR: "Continuer →", EN: "Next →" },
  "gen_generate": { FR: "Générer la carte", EN: "Generate Menu" },
  "gen_generating": { FR: "Création en cours...", EN: "Creation in progress..." },
  "gen_return_board": { FR: "Retour au tableau de bord", EN: "Back to Dashboard" },
  "gen_ready": { FR: "Prêt à générer", EN: "Ready to generate" },
  "gen_ready_desc": { FR: "L'IA va composer une carte intelligente ETK360 respectant les contraintes.", EN: "AI will compose a smart ETK360 menu respecting constraints." },

  "kiosk_make_choice": { FR: "Faites votre choix pour commencer", EN: "Make a choice to start" },
  "kiosk_sur_place": { FR: "SUR PLACE", EN: "EAT IN" },
  "kiosk_emporter": { FR: "À EMPORTER", EN: "TAKE AWAY" },
  
  // Kiosk Modal
  "modal_composition_remove": { FR: "Souhaitez-vous retirer un ingrédient ?", EN: "Would you like to remove an ingredient?" },
  "modal_composition_choose": { FR: "Veuillez choisir votre", EN: "Please choose your" },
  "modal_selected": { FR: "sélectionné", EN: "selected" },
  "modal_selected_plural": { FR: "sélectionnés", EN: "selected" },
  "modal_prev": { FR: "← Précédent", EN: "← Previous" },
  "modal_skip": { FR: "Passer cette étape", EN: "Skip this step" },
  "modal_next": { FR: "Suivant →", EN: "Next →" },
  "modal_finish": { FR: "Terminer", EN: "Done" },
  "modal_validate": { FR: "Valider mon menu", EN: "Validate menu" },
  
  // Kiosk Cart Bar
  "cart_your_order": { FR: "Votre Commande", EN: "Your Order" },
  "cart_item": { FR: "article", EN: "item" },
  "cart_items": { FR: "articles", EN: "items" },
  "cart_pay": { FR: "Régler", EN: "Pay" },
  
  // Toast
  "toast_added": { FR: "a été ajouté !", EN: "was added!" }
};

interface LanguageContextProps {
  lang: SupportedLang;
  setLang: (l: SupportedLang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<SupportedLang>('FR');

  const t = (key: string) => {
    return dictionary[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
