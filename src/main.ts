import { createApp } from "./app/createApp";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app root");

createApp(root);
