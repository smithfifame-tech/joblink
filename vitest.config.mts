import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // « server-only » lève une erreur hors du runtime React Server : neutralisé pour les tests unitaires
      "server-only": fileURLToPath(new URL("./tests/unit/__mocks__/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globals: false,
    env: { TZ: "Africa/Porto-Novo" },
  },
});
