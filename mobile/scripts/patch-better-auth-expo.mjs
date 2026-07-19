import { readFileSync, writeFileSync } from "node:fs";

const clientPath = new URL(
  "../node_modules/@better-auth/expo/dist/client.js",
  import.meta.url,
);

const original = readFileSync(clientPath, "utf8");
const marker = "// Shiftora Expo SDK 53 static-import compatibility";

if (!original.includes(marker)) {
  const importAnchor = 'import { AppState, Platform } from "react-native";';
  const networkImport = 'import("expo-network")';
  const browserImport = 'import("expo-web-browser")';

  if (
    !original.includes(importAnchor) ||
    !original.includes(networkImport) ||
    !original.includes(browserImport)
  ) {
    throw new Error(
      "@better-auth/expo changed its client bundle; review the Expo compatibility patch before installing.",
    );
  }

  const patched = original
    .replace(
      importAnchor,
      `${importAnchor}\n${marker}\nimport * as ExpoNetwork from "expo-network";\nimport * as ExpoWebBrowser from "expo-web-browser";`,
    )
    .replace(networkImport, "Promise.resolve(ExpoNetwork)")
    .replace(browserImport, "Promise.resolve(ExpoWebBrowser)");

  writeFileSync(clientPath, patched);
}
