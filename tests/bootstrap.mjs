import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Run the real database service and SQL against Node's built-in SQLite.
// This adapter deliberately does not pretend to test Expo's native bridge.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo') return { url: new URL('./native-crypto-adapter.ts', import.meta.url).href, shortCircuit: true };
    if (specifier === "expo-sqlite")
      return {
        url: new URL("./sqlite-adapter.ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier === "expo-crypto")
      return {
        url: new URL("./crypto-adapter.ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier === "expo-secure-store")
      return {
        url: new URL("./secure-store-adapter.ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier === "expo-file-system/legacy")
      return {
        url: new URL("./file-adapter.ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier === "expo-document-picker")
      return {
        url: new URL("./picker-adapter.ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier === "expo-image-picker")
      return {
        url: new URL("./picker-adapter.ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier.startsWith(".") && context.parentURL) {
      const candidate = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(candidate)))
        return { url: candidate.href, shortCircuit: true };
      const index = new URL(specifier + "/index.ts", context.parentURL);
      if (existsSync(fileURLToPath(index)))
        return { url: index.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
