import { createAuthClient } from "better-auth/react";

// In the browser, always target the current origin so auth requests (e.g.
// sign-out) hit the same server that set the session cookie — otherwise a
// dev-port mismatch (app on :3001 while NEXT_PUBLIC_APP_URL is :3000) sends
// sign-out to the wrong origin and the session cookie is never cleared.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
});
