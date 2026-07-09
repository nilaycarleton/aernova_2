// Resolve the app's "@/..." path alias (tsconfig paths) when running server
// modules directly under Node (scripts, one-off checks). Next/Turbopack handles
// this in-app; plain Node does not. Use with: node --import ./scripts/alias-register.mjs
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

const root = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let p = resolvePath(root, specifier.slice(2));
      if (!/\.[a-z]+$/.test(p)) {
        if (existsSync(`${p}.ts`)) p += ".ts";
        else if (existsSync(`${p}.tsx`)) p += ".tsx";
        else if (existsSync(resolvePath(p, "index.ts"))) p = resolvePath(p, "index.ts");
      }
      return nextResolve(pathToFileURL(p).href, context);
    }
    return nextResolve(specifier, context);
  },
});
