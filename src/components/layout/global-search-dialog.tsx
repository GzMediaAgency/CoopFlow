"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  Search,
  X,
  Users,
  Package,
  UserRound,
  ClipboardList,
  FileText,
  Wallet,
  Sprout,
  FolderOpen,
  Loader2,
  ArrowRight,
  CornerDownLeft,
  Boxes,
  Truck,
  ShoppingCart,
  Receipt,
  HandCoins,
  type LucideIcon,
} from "lucide-react";
import { performGlobalSearch } from "@/app/[locale]/(app)/search-actions";
import type { SearchGroupedResults, SearchResultItem, SearchItemType } from "@/services/search";

const TYPE_ICONS: Record<SearchItemType, LucideIcon> = {
  member: Users,
  product: Package,
  customer: UserRound,
  order: ClipboardList,
  invoice: FileText,
  payment: Wallet,
  production: Sprout,
  document: FolderOpen,
};

const QUICK_MODULES = [
  { key: "members", href: "/members", icon: Users, fr: "Membres", ar: "الأعضاء" },
  { key: "production", href: "/production", icon: Sprout, fr: "Production", ar: "الإنتاج" },
  { key: "products", href: "/products", icon: Package, fr: "Produits", ar: "المنتجات" },
  { key: "stock", href: "/stock", icon: Boxes, fr: "Stocks", ar: "المخزون" },
  { key: "orders", href: "/orders", icon: ClipboardList, fr: "Commandes", ar: "الطلبيات" },
  { key: "customers", href: "/customers", icon: UserRound, fr: "Clients", ar: "الزبناء" },
  { key: "suppliers", href: "/suppliers", icon: Truck, fr: "Fournisseurs", ar: "الموردون" },
  { key: "sales", href: "/sales", icon: ShoppingCart, fr: "Ventes", ar: "المبيعات" },
  { key: "invoices", href: "/invoices", icon: FileText, fr: "Factures", ar: "الفواتير" },
  { key: "payments", href: "/payments", icon: Wallet, fr: "Paiements", ar: "المدفوعات" },
  { key: "expenses", href: "/expenses", icon: Receipt, fr: "Dépenses", ar: "المصاريف" },
  { key: "contributions", href: "/contributions", icon: HandCoins, fr: "Cotisations", ar: "الاشتراكات" },
];

export function GlobalSearchDialog() {
  const t = useTranslations("topbar");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGroupedResults | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Raccourci global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus automatique à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Recherche avec debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await performGlobalSearch(query);
          setResults(res);
          setSelectedIndex(0);
        } catch (e) {
          console.error("Search failed", e);
        }
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Liste plate des éléments navigables pour les touches fléchées
  const allItems: SearchResultItem[] = results
    ? [
        ...results.members,
        ...results.products,
        ...results.customers,
        ...results.orders,
        ...results.invoices,
        ...results.payments,
        ...results.productions,
        ...results.documents,
      ]
    : [];

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Navigation clavier dans les résultats
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (allItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) {
        handleSelect(item.href);
      }
    }
  };

  const GroupSection = ({
    title,
    items,
    startIndex,
  }: {
    title: string;
    items: SearchResultItem[];
    startIndex: number;
  }) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-3">
        <h3 className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {title} ({items.length})
        </h3>
        <ul className="space-y-1">
          {items.map((item, idx) => {
            const globalIdx = startIndex + idx;
            const isSelected = globalIdx === selectedIndex;
            const Icon = TYPE_ICONS[item.type] || Search;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(item.href)}
                  onMouseEnter={() => setSelectedIndex(globalIdx)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-start text-sm transition-colors ${
                    isSelected
                      ? "bg-canopy/10 text-forest font-semibold"
                      : "text-ink hover:bg-field"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`grid size-8 place-items-center rounded-lg shrink-0 ${
                        isSelected ? "bg-canopy text-white" : "bg-field text-ink-muted border border-line"
                      }`}
                    >
                      <Icon size={16} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-xs text-ink-muted truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="rounded-md bg-field px-2 py-0.5 text-xs font-semibold text-ink-muted border border-line">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft size={14} className="text-canopy hidden sm:inline" />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <>
      {/* Bouton déclencheur dans le header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex max-w-xl flex-1 items-center justify-between rounded-full border border-line bg-field py-2 ps-10 pe-3 text-sm text-ink-muted hover:border-canopy/40 hover:bg-white transition-all shadow-2xs"
        aria-label={t("search")}
      >
        <Search
          size={16}
          className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-hover:text-canopy transition-colors"
          aria-hidden
        />
        <span className="truncate text-xs sm:text-sm">{t("search")}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-line bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-ink-muted shadow-2xs group-hover:text-forest">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Modale Command Palette */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-forest/40 p-3 pt-12 sm:pt-20 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? "rtl" : "ltr"}
          >
            {/* Barre de saisie */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3 bg-white">
              <Search size={18} className="text-canopy shrink-0" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  isAr
                    ? "ابحث عن عضو، منتج، زبون، فاتورة، دفعة…"
                    : "Rechercher un membre, produit, client, commande, facture, lot…"
                }
                className="w-full bg-transparent text-sm sm:text-base outline-none text-ink placeholder:text-ink-muted"
              />
              {isPending && <Loader2 size={16} className="animate-spin text-canopy shrink-0" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-md p-1 text-ink-muted hover:bg-field hover:text-ink"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="hidden sm:inline-block rounded border border-line bg-field px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                ESC
              </kbd>
            </div>

            {/* Corps des résultats */}
            <div ref={listRef} className="overflow-y-auto p-3 flex-1">
              {/* État initial : accès rapide aux modules */}
              {!query.trim() && (
                <div className="p-2 space-y-4">
                  <div>
                    <h3 className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      {isAr ? "الوصول السريع إلى الأقسام" : "Accès rapide aux modules"}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {QUICK_MODULES.map((mod) => {
                        const Icon = mod.icon;
                        return (
                          <button
                            key={mod.key}
                            type="button"
                            onClick={() => handleSelect(mod.href)}
                            className="flex items-center gap-2.5 rounded-xl border border-line/60 bg-field/50 p-2.5 text-xs font-medium text-ink hover:border-canopy/40 hover:bg-canopy-soft/40 hover:text-canopy transition-all text-start"
                          >
                            <span className="grid size-7 place-items-center rounded-lg bg-white text-forest shadow-2xs border border-line/60">
                              <Icon size={14} />
                            </span>
                            <span className="truncate">{isAr ? mod.ar : mod.fr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line/70 bg-field/70 p-3 text-xs text-ink-muted">
                    <p className="font-semibold text-forest mb-1">
                      {isAr ? "💡 نصيحة للبحث الفوري :" : "💡 Astuce de recherche multi-entités :"}
                    </p>
                    <p>
                      {isAr
                        ? "اكتب اسم العضوة (مثال: فاطمة)، أو رمز المنتج (مثال: ARG)، أو رقم الفاتورة أو اسم الزبون لتظهر كل العناصر المرتبطة به فورا."
                        : "Tapez le nom d'un membre (ex: Fatima), la référence d'un produit (ex: ARG), le nom d'un client ou un numéro de commande pour afficher tous ses flux associés."}
                    </p>
                  </div>
                </div>
              )}

              {/* Résultats groupés */}
              {query.trim().length >= 2 && results && results.total > 0 && (
                <div>
                  <GroupSection
                    title={isAr ? "الأعضاء" : "Membres"}
                    items={results.members}
                    startIndex={0}
                  />
                  <GroupSection
                    title={isAr ? "المنتجات" : "Produits"}
                    items={results.products}
                    startIndex={results.members.length}
                  />
                  <GroupSection
                    title={isAr ? "الزبناء" : "Clients"}
                    items={results.customers}
                    startIndex={results.members.length + results.products.length}
                  />
                  <GroupSection
                    title={isAr ? "الطلبيات" : "Commandes"}
                    items={results.orders}
                    startIndex={
                      results.members.length + results.products.length + results.customers.length
                    }
                  />
                  <GroupSection
                    title={isAr ? "الفواتير" : "Factures"}
                    items={results.invoices}
                    startIndex={
                      results.members.length +
                      results.products.length +
                      results.customers.length +
                      results.orders.length
                    }
                  />
                  <GroupSection
                    title={isAr ? "المدفوعات" : "Paiements"}
                    items={results.payments}
                    startIndex={
                      results.members.length +
                      results.products.length +
                      results.customers.length +
                      results.orders.length +
                      results.invoices.length
                    }
                  />
                  <GroupSection
                    title={isAr ? "سجلات الإنتاج والدفعات" : "Production & Lots"}
                    items={results.productions}
                    startIndex={
                      results.members.length +
                      results.products.length +
                      results.customers.length +
                      results.orders.length +
                      results.invoices.length +
                      results.payments.length
                    }
                  />
                  <GroupSection
                    title={isAr ? "الوثائق" : "Documents"}
                    items={results.documents}
                    startIndex={
                      results.members.length +
                      results.products.length +
                      results.customers.length +
                      results.orders.length +
                      results.invoices.length +
                      results.payments.length +
                      results.productions.length
                    }
                  />
                </div>
              )}

              {/* Aucun résultat */}
              {query.trim().length >= 2 && results && results.total === 0 && !isPending && (
                <div className="py-12 text-center text-ink-muted">
                  <Search size={32} className="mx-auto text-line mb-3" />
                  <p className="font-semibold text-forest">
                    {isAr
                      ? `لم يتم العثور على أي نتيجة لـ « ${query} »`
                      : `Aucun résultat pour « ${query} »`}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">
                    {isAr
                      ? "تحقق من الكلمات أو ابحث بالاسم الشخصي أو المرجع أو رقم الهاتف."
                      : "Vérifiez l'orthographe ou essayez avec un nom, une référence SKU ou un numéro."}
                  </p>
                </div>
              )}
            </div>

            {/* Pied de la modale */}
            <div className="border-t border-line bg-field/60 px-4 py-2.5 text-[11px] text-ink-muted flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-white px-1 font-mono">↑</kbd>
                  <kbd className="rounded border border-line bg-white px-1 font-mono">↓</kbd>
                  <span>{isAr ? "للتنقل" : "Naviguer"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-white px-1.5 font-mono">↵</kbd>
                  <span>{isAr ? "للاختيار" : "Ouvrir"}</span>
                </span>
              </div>
              <span>CoopFlow Search</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

