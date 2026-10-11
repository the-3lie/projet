/**
 * Gestion centralisée du CORS (API REST + Socket.IO).
 *
 * Variable d'environnement : CORS_ORIGINS
 *   - liste d'origines séparées par des virgules, sans slash final ;
 *   - le caractère * est accepté comme joker (ex. https://*.vercel.app) ;
 *   - si la variable est absente, toutes les origines sont acceptées
 *     (pratique en local, À ÉVITER en production).
 *
 * Exemple :
 *   CORS_ORIGINS=https://admin-xxx.vercel.app,https://enseignant-xxx.vercel.app,https://*.vercel.app,https://localhost,capacitor://localhost
 *
 * La liste est relue à chaque requête : elle ne dépend donc pas de l'ordre
 * de chargement du fichier .env.
 */

function parseOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function matches(pattern: string, origin: string): boolean {
  if (!pattern.includes('*')) return pattern === origin;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`).test(origin);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  const allowed = parseOrigins();
  if (allowed.length === 0) return true; // pas de restriction configurée
  if (!origin) return true; // requêtes serveur-à-serveur, curl, healthchecks
  const clean = origin.replace(/\/+$/, '');
  return allowed.some((pattern) => matches(pattern, clean));
}

export function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  callback(null, isOriginAllowed(origin));
}
