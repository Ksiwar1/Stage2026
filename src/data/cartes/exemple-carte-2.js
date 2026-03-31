export const carteAlerte = {
  titre: "Alerte de Sécurité",
  description: "Une tentative de connexion inhabituelle a été détectée sur votre compte.",
  type: "Avertissement",
  priorite: 5,
  couleurHex: "#e52e71",
  actions: [
    { label: "Vérifier", url: "/securite" },
    { label: "Ignorer", url: "#" }
  ]
};
