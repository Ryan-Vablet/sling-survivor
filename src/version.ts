/**
 * Version is read from the root `VERSION` file (single source of truth).
 * Displayed in the bottom-right of the app. See README for versioning convention.
 */
import versionRaw from "../VERSION?raw";

export const VERSION = versionRaw.trim();
