import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CoopFlow — Gestion des Coopératives Marocaines",
    short_name: "CoopFlow",
    description:
      "Plateforme SaaS professionnelle de gestion des coopératives marocaines (Membres, Production, Stocks, Ventes, Facturation).",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fefaef",
    theme_color: "#123f38",
    lang: "fr",
    dir: "auto",
    categories: ["business", "productivity", "agriculture"],
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Nouvelle vente",
        short_name: "Vente",
        description: "Enregistrer une nouvelle vente",
        url: "/sales/new",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
      {
        name: "Ajouter un membre",
        short_name: "Membre",
        description: "Inscrire un nouveau membre à la coopérative",
        url: "/members/new",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
      {
        name: "Enregistrer production",
        short_name: "Production",
        description: "Ajouter une récolte ou production de lot",
        url: "/production/new",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
      {
        name: "Mouvement de stock",
        short_name: "Stock",
        description: "Entrée ou sortie de stock",
        url: "/stock/movements/new",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
    ],
  };
}

