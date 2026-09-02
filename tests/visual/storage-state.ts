import path from "node:path";

/** Shared by auth.setup.ts (writer) and every authenticated spec (reader). */
export const STORAGE_STATE = path.join(__dirname, ".clerk/visual-test-user.json");
