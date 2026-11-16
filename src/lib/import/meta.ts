import type { PermissionCode } from "@/lib/auth/permissions";

export type ImportEntity = "members" | "products" | "customers" | "suppliers" | "stock";
export type FieldMeta = { key: string; required?: boolean; aliases: string[] }; // aliases[0] = en-tête du modèle téléchargeable
export const MAX_ROWS = 1000;

export const IMPORT_META: Record<ImportEntity, { permission: PermissionCode; listHref: string; fields: FieldMeta[] }> = {
  members: { permission: "members:write", listHref: "/members", fields: [
    { key: "firstName", required: true, aliases: ["Prénom", "first name", "firstname"] }, { key: "lastName", required: true, aliases: ["Nom", "last name", "nom de famille", "lastname"] },
    { key: "cin", aliases: ["CIN", "carte nationale"] }, { key: "birthDate", aliases: ["Date de naissance", "naissance"] },
    { key: "phone", aliases: ["Téléphone", "tel", "gsm", "mobile"] }, { key: "email", aliases: ["E-mail", "email", "mail", "courriel"] },
    { key: "address", aliases: ["Adresse"] }, { key: "city", aliases: ["Ville"] }, { key: "joinedAt", aliases: ["Date d'adhésion", "adhesion"] },
    { key: "groupName", aliases: ["Groupe"] }, { key: "role", aliases: ["Fonction", "role"] }, { key: "status", aliases: ["Statut"] }, { key: "notes", aliases: ["Notes", "remarques"] } ] },
  products: { permission: "products:write", listHref: "/products", fields: [
    { key: "name", required: true, aliases: ["Nom du produit", "nom", "produit", "designation"] }, { key: "nameAr", aliases: ["Nom en arabe"] },
    { key: "sku", aliases: ["Référence", "reference", "ref", "code", "sku"] }, { key: "category", aliases: ["Catégorie", "famille"] }, { key: "unit", aliases: ["Unité"] },
    { key: "purchasePrice", aliases: ["Prix d'achat", "prix de revient", "cout"] }, { key: "priceRetail", aliases: ["Prix de vente", "prix de detail", "prix"] },
    { key: "priceProfessional", aliases: ["Prix professionnel", "prix pro"] }, { key: "priceReseller", aliases: ["Prix revendeur"] }, { key: "priceMember", aliases: ["Prix membre"] },
    { key: "vatRate", aliases: ["TVA"] }, { key: "stockMin", aliases: ["Stock minimum", "seuil"] }, { key: "stockMax", aliases: ["Stock maximum"] },
    { key: "shelfLifeDays", aliases: ["Conservation (jours)", "duree de conservation", "conservation"] }, { key: "description", aliases: ["Description"] } ] },
  customers: { permission: "customers:write", listHref: "/customers", fields: [
    { key: "name", required: true, aliases: ["Nom", "client"] }, { key: "company", aliases: ["Entreprise", "societe"] }, { key: "type", aliases: ["Type"] },
    { key: "phone", aliases: ["Téléphone", "tel", "gsm"] }, { key: "email", aliases: ["E-mail", "email", "mail"] }, { key: "address", aliases: ["Adresse"] },
    { key: "city", aliases: ["Ville"] }, { key: "ice", aliases: ["ICE"] }, { key: "notes", aliases: ["Notes"] } ] },
  suppliers: { permission: "suppliers:write", listHref: "/suppliers", fields: [
    { key: "name", required: true, aliases: ["Nom", "fournisseur"] }, { key: "company", aliases: ["Entreprise", "societe"] }, { key: "phone", aliases: ["Téléphone", "tel", "gsm"] },
    { key: "email", aliases: ["E-mail", "email", "mail"] }, { key: "ice", aliases: ["ICE"] }, { key: "taxId", aliases: ["IF", "identifiant fiscal"] },
    { key: "address", aliases: ["Adresse"] }, { key: "notes", aliases: ["Notes"] } ] },
  stock: { permission: "stock:write", listHref: "/stock", fields: [
    { key: "sku", required: true, aliases: ["Référence", "reference", "ref", "code", "sku"] }, { key: "quantity", required: true, aliases: ["Quantité", "qte", "stock"] } ] },
};
export const ENTITIES = Object.keys(IMPORT_META) as ImportEntity[];
