import { defineRouting } from "next-intl/routing";

// Central routing config - used by middleware and navigation hooks
export const routing = defineRouting({
  locales: ["ru", "kk", "en"],
  defaultLocale: "ru",
});
