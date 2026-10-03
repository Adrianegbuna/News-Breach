import fs from "node:fs";
import path from "node:path";
import { transformFileSync } from "@babel/core";

const rootDir = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const env = readEnvFile(path.join(rootDir, ".env"));
const apiBaseUrl = process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || "";

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });

const app = transformFileSync(path.join(srcDir, "main.jsx"), {
  babelrc: false,
  configFile: false,
  presets: [["@babel/preset-react", { runtime: "classic" }]],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
  sourceType: "module",
}).code;

const bundle = `
const process = { env: { NODE_ENV: "production" } };
const exports = {};
const moduleCache = {};
const modules = {
  react(module, exports) {
${indent(fs.readFileSync(resolvePackageFile("react", "cjs/react.production.js"), "utf8"))}
  },
  "react-dom"(module, exports, require) {
${indent(fs.readFileSync(resolvePackageFile("react-dom", "cjs/react-dom.production.js"), "utf8"))}
  },
  "react-dom/client"(module, exports, require) {
${indent(fs.readFileSync(resolvePackageFile("react-dom", "cjs/react-dom-client.production.js"), "utf8"))}
  },
  scheduler(module, exports) {
${indent(fs.readFileSync(resolvePackageFile("scheduler", "cjs/scheduler.production.js"), "utf8"))}
  },
  "./styles.css"(module) {
    module.exports = {};
  },
  app(module, exports, require) {
${indent(app)}
  }
};

function require(name) {
  if (moduleCache[name]) {
    return moduleCache[name].exports;
  }
  const factory = modules[name];
  if (!factory) {
    throw new Error("Module not found: " + name);
  }
  const module = { exports: {} };
  moduleCache[name] = module;
  factory(module, module.exports, require);
  return module.exports;
}

require("app");
`;

fs.writeFileSync(path.join(distDir, "assets", "app.js"), bundle.trimStart());
fs.copyFileSync(path.join(srcDir, "styles.css"), path.join(distDir, "assets", "styles.css"));
fs.writeFileSync(
  path.join(distDir, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>News Breach</title>
    <link rel="stylesheet" href="/assets/styles.css" />
    <script>window.NEWS_BREACH_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};</script>
  </head>
  <body>
    <div id="root"></div>
    <script src="/assets/app.js"></script>
  </body>
</html>
`,
);

function resolvePackageFile(packageName, relativePath) {
  return path.join(rootDir, "..", "node_modules", packageName, relativePath);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

function indent(value) {
  return value
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}
