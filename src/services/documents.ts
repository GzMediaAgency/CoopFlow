import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { DocumentCategory } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 20;
const BUCKET = "documents", MAX = 10 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const MAGIC: Record<string, number[]> = { pdf: [0x25, 0x50, 0x44, 0x46], png: [0x89, 0x50, 0x4e, 0x47], jpg: [0xff, 0xd8, 0xff], webp: [0x52, 0x49, 0x46, 0x46], docx: [0x50, 0x4b], xlsx: [0x50, 0x4b] };

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new DomainError("storageUnavailable");
  return createClient(url, key, { auth: { persistSession: false } }).storage; // clé serveur : jamais envoyée au navigateur
}
let ready = false;
async function ensureBucket(s: ReturnType<typeof storage>) {
  if (ready) return;
  await s.createBucket(BUCKET, { public: false, fileSizeLimit: MAX }); // erreur « existe déjà » ignorée
  ready = true;
}

export async function listDocuments(ctx: Ctx, f: { q?: string; category?: DocumentCategory; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = { deletedAt: null, ...(f.category ? { category: f.category } : {}), ...(f.q ? { name: { contains: f.q, mode: "insensitive" as const } } : {}) };
  const [items, count, total] = await Promise.all([
    ctx.db.document.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ctx.db.document.count({ where }), ctx.db.document.count({ where: { deletedAt: null } }),
  ]);
  return { items, count, hasAny: total > 0, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function uploadDocument(ctx: Ctx, file: File, meta: { category: DocumentCategory; name?: string; expiresAt?: string }) {
  if (!file || file.size === 0) throw new DomainError("fileRequired");
  if (file.size > MAX) throw new DomainError("fileTooBig");
  const ext = TYPES[file.type];
  if (!ext) throw new DomainError("fileType");
  const buf = Buffer.from(await file.arrayBuffer());
  const magic = MAGIC[ext];
  if (magic && !magic.every((b, i) => buf[i] === b)) throw new DomainError("fileType"); // le contenu doit correspondre au type annoncé
  const clean = (meta.name ?? file.name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120) || "document";
  const path = `${ctx.org.id}/${randomUUID()}.${ext}`; // jamais le nom envoyé par l'utilisateur dans le chemin
  const s = storage();
  await ensureBucket(s);
  const up = await s.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
  if (up.error) throw new DomainError("storageFailed");
  try {
    const d = await ctx.db.document.create({ data: { organizationId: ctx.org.id, category: meta.category, name: clean, storagePath: path, mimeType: file.type, sizeBytes: file.size, expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null, uploadedById: ctx.user.id } });
    await audit(ctx, "CREATE", "document", d.id, { name: clean, size: file.size });
    return d;
  } catch (e) { await s.from(BUCKET).remove([path]); throw e; }
}

/** Lien signé de 60 secondes, uniquement pour un document de la coopérative de l'utilisateur. */
export async function documentLink(ctx: Ctx, id: string, download: boolean) {
  const d = await ctx.db.document.findFirst({ where: { id, deletedAt: null } });
  if (!d) throw new DomainError("documentNotFound");
  const { data, error } = await storage().from(BUCKET).createSignedUrl(d.storagePath, 60, download ? { download: d.name } : undefined);
  if (error || !data) throw new DomainError("storageFailed");
  return data.signedUrl;
}

export async function deleteDocument(ctx: Ctx, id: string) {
  const d = await ctx.db.document.findFirst({ where: { id, deletedAt: null } });
  if (!d) throw new DomainError("documentNotFound");
  await ctx.db.document.update({ where: { id }, data: { deletedAt: new Date() } });
  await storage().from(BUCKET).remove([d.storagePath]); // suppression du fichier ; la ligne reste tracée
  await audit(ctx, "DELETE", "document", id, { name: d.name });
}
