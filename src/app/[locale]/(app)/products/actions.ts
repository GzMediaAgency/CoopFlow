"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { productSchema } from "@/schemas/product";
import { archiveProduct, createProduct, updateProduct } from "@/services/products";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveProduct(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("products:write");
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let productId: string;
  try {
    productId = (id ? await updateProduct(ctx, id, parsed.data) : await createProduct(ctx, parsed.data)).id;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { errors: { sku: ["skuTaken"] } };
    console.error("[products] save failed", e);
    return { error: "generic" };
  }
  revalidatePath("/[locale]/products", "layout");
  redirect({ href: `/products/${productId}`, locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}

export async function archive(id: string) {
  const ctx = await requirePermission("products:delete");
  await archiveProduct(ctx, id);
  revalidatePath("/[locale]/products", "layout");
  redirect({ href: "/products", locale: await getLocale() });
}
