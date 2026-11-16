import { z } from "zod";
import { prisma } from "@/lib/db/tenant";

export type PublicProduct = NonNullable<Awaited<ReturnType<typeof getPublicProduct>>>;

// Produits de démonstration pour la « Coopérative Tazrout » (utilisés en cas de DB inaccessible ou en mode aperçu)
const DEMO_ORG = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Coopérative Tazrout",
  slug: "tazrout",
  logoUrl: null,
  type: "TERROIR" as const,
  sector: "TERROIR" as const,
  city: "Agadir",
  region: "Souss-Massa",
  address: "Douar Tazrout, Commune d'Amskroud",
  phone: "+212 5 28 84 00 12",
  email: "contact@tazrout.demo",
  website: "https://coopflow.ma",
  ice: "002891456000089",
  taxId: "45892134",
  description:
    "Coopérative féminine du terroir d'arganier et d'apiculture traditionnelle, fondée pour valoriser le savoir-faire ancestral des femmes rurales du Souss-Massa.",
};

const DEMO_PRODUCTS: Record<string, any> = {
  "ARG-ALI": {
    id: "00000000-0000-0000-0000-000000000101",
    name: "Huile d'argan alimentaire 250 ml",
    nameAr: "زيت أركان غذائي 250 مل",
    sku: "ARG-ALI",
    slug: "huile-argan-alimentaire-250ml",
    description:
      "Huile d'argan alimentaire pure et biologique, extraite par première pression à froid à partir d'amandons torréfiés au feu de bois selon la tradition des femmes du Souss. Arôme boisé et notes délicates de noisette.",
    photoUrl: null,
    unit: "UNIT" as const,
    priceRetail: 180,
    category: { id: "cat-1", name: "Huiles & Terroir" },
    organization: DEMO_ORG,
    batches: [
      {
        id: "batch-1",
        batchNumber: "ARG-2026-0915",
        producedAt: new Date(2026, 8, 15),
        expiresAt: new Date(2028, 8, 15),
        origin: "Réserve de Biosphère de l'Arganeraie (RBA), Souss",
        producerName: "Groupe Argan · Fatima Zahra Aït Brahim",
        status: "AVAILABLE",
        notes: "Amandons récoltés sous contrôle qualité coopérative",
        records: [
          {
            id: "rec-1",
            producedAt: new Date(2026, 8, 15),
            quantity: 250,
            unit: "LITRE",
            quality: "Extra Vierge · Pression à froid",
            groupName: "Groupe Argan",
            plotOrUnit: "Unité de trituration Tazrout",
            member: { firstName: "Fatima Zahra", lastName: "Aït Brahim" },
          },
        ],
      },
      {
        id: "batch-2",
        batchNumber: "ARG-2026-0610",
        producedAt: new Date(2026, 5, 10),
        expiresAt: new Date(2028, 5, 10),
        origin: "Arganeraie d'Amskroud",
        producerName: "Groupe Argan · Khadija Oubella",
        status: "PARTIALLY_SOLD",
        notes: "Contrôle d'acidité < 0.5%",
        records: [],
      },
    ],
  },
  "ARG-COS": {
    id: "00000000-0000-0000-0000-000000000102",
    name: "Huile d'argan cosmétique 100 ml",
    nameAr: "زيت أركان تجميلي 100 مل",
    sku: "ARG-COS",
    slug: "huile-argan-cosmetique-100ml",
    description:
      "Huile d'argan cosmétique 100% pure, vierge et non torréfiée. Naturellement riche en vitamine E et acides gras essentiels pour hydrater et revitaliser la peau et les cheveux.",
    photoUrl: null,
    unit: "UNIT" as const,
    priceRetail: 140,
    category: { id: "cat-2", name: "Cosmétique naturelle" },
    organization: DEMO_ORG,
    batches: [
      {
        id: "batch-cos-1",
        batchNumber: "ARC-2026-0920",
        producedAt: new Date(2026, 8, 20),
        expiresAt: new Date(2028, 8, 20),
        origin: "Terroir Tazrout",
        producerName: "Groupe Argan",
        status: "AVAILABLE",
        notes: "Pressée à froid sans torréfaction",
        records: [
          {
            id: "rec-cos-1",
            producedAt: new Date(2026, 8, 20),
            quantity: 120,
            unit: "LITRE",
            quality: "100% Vierge pure",
            groupName: "Groupe Argan",
            plotOrUnit: "Unité cosmétique",
            member: { firstName: "Aïcha", lastName: "Ouhmad" },
          },
        ],
      },
    ],
  },
  AMLOU: {
    id: "00000000-0000-0000-0000-000000000103",
    name: "Amlou artisanal aux amandes & miel d'oranger 250 g",
    nameAr: "أملو باللوز البلدي وعسل البرتقال 250 غ",
    sku: "AMLOU",
    slug: "amlou-artisanal-amandes-miel",
    description:
      "Pâte à tartiner traditionnelle marocaine préparée à la meule de pierre avec des amandes beldi grillées, de l'huile d'argan alimentaire et du miel d'oranger pur.",
    photoUrl: null,
    unit: "UNIT" as const,
    priceRetail: 65,
    category: { id: "cat-3", name: "Épicerie fine" },
    organization: DEMO_ORG,
    batches: [
      {
        id: "batch-aml-1",
        batchNumber: "AML-2026-1002",
        producedAt: new Date(2026, 9, 2),
        expiresAt: new Date(2027, 9, 2),
        origin: "Souss · Amandes de Tafraout",
        producerName: "Atelier Amlou Tazrout",
        status: "AVAILABLE",
        notes: "Broyage lent sur meule de pierre traditionnelle",
        records: [],
      },
    ],
  },
  SAFRAN: {
    id: "00000000-0000-0000-0000-000000000104",
    name: "Safran pur de Taliouine AOP 2 g",
    nameAr: "زعفران تاليوين الحر الأصلي 2 غ",
    sku: "SAFRAN",
    slug: "safran-pur-taliouine-2g",
    description:
      "L'or rouge du Maroc, récolté fleur par fleur à l'aube sur les plateaux de Taliouine. Pistils entiers séchés naturellement, arôme puissant et pouvoir colorant exceptionnel.",
    photoUrl: null,
    unit: "G" as const,
    priceRetail: 85,
    category: { id: "cat-4", name: "Épices & Terroir" },
    organization: DEMO_ORG,
    batches: [
      {
        id: "batch-saf-1",
        batchNumber: "SAF-2026-1025",
        producedAt: new Date(2026, 9, 25),
        expiresAt: new Date(2029, 9, 25),
        origin: "Taliouine, Anti-Atlas",
        producerName: "Groupe Safran",
        status: "AVAILABLE",
        notes: "Certifié AOP Safran de Taliouine",
        records: [],
      },
    ],
  },
};

/**
 * Récupération publique d'un produit et de sa traçabilité terroir.
 * Ne nécessite AUCUNE authentification.
 * Accessible par UUID, slug ou SKU.
 */
export async function getPublicProduct(identifier: string) {
  if (!identifier || typeof identifier !== "string") return null;

  const isUuid = z.string().uuid().safeParse(identifier).success;

  try {
    const product = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        ...(isUuid
          ? { id: identifier }
          : {
              OR: [
                { slug: identifier },
                { sku: { equals: identifier, mode: "insensitive" } },
              ],
            }),
      },
      include: {
        category: { select: { id: true, name: true } },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            type: true,
            sector: true,
            city: true,
            region: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            ice: true,
            taxId: true,
            description: true,
          },
        },
        batches: {
          where: { status: { not: "EXPIRED" } },
          orderBy: { producedAt: "desc" },
          take: 12,
          include: {
            records: {
              orderBy: { producedAt: "desc" },
              take: 5,
              include: {
                member: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (product) return product;
  } catch {
    // Si la base de données n'est pas encore connectée ou joignable, fallback démo gracieux
  }

  // Fallback démo par SKU ou slug
  const upper = identifier.toUpperCase();
  const demoMatch =
    DEMO_PRODUCTS[upper] ||
    Object.values(DEMO_PRODUCTS).find(
      (p) => p.slug === identifier || p.id === identifier || p.sku.toLowerCase() === identifier.toLowerCase()
    );

  if (demoMatch) return demoMatch;

  // Si c'est un test générique ou première découverte, retourner le produit emblématique Huile d'Argan
  if (identifier === "test" || identifier === "demo" || identifier === "argan") {
    return DEMO_PRODUCTS["ARG-ALI"];
  }

  return null;
}
