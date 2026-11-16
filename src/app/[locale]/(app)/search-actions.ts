"use server";

import { requireUser } from "@/lib/auth/session";
import { searchGlobal, type SearchGroupedResults } from "@/services/search";

export async function performGlobalSearch(query: string): Promise<SearchGroupedResults> {
  const ctx = await requireUser();
  return searchGlobal(ctx, query);
}

