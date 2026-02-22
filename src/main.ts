import { createApp } from "./app/createApp";
import { VERSION } from "./version";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app root");

const versionEl = document.getElementById("version-badge");
if (versionEl) versionEl.textContent = `v${VERSION}`;

createApp(root);
