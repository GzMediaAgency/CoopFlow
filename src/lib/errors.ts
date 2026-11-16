/** Erreur métier prévisible : `code` est une clé de traduction (errors.<code>). */
export class DomainError extends Error {
  constructor(public code: string) { super(code); }
}
