import createNextIntlPlugin from "next-intl/plugin";
export default createNextIntlPlugin("./src/i18n/request.ts")({
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  experimental: { serverActions: { bodySizeLimit: "10mb" } }, // envoi de documents (10 Mo max, revérifié côté serveur)
});
