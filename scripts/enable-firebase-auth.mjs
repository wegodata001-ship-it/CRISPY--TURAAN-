import { readFileSync } from "fs";
import { resolve } from "path";

const token = JSON.parse(
  readFileSync(
    resolve(process.env.USERPROFILE || "", ".config/configstore/firebase-tools.json"),
    "utf-8"
  )
).tokens.access_token;

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error("Configuration Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is required");
}

async function enableEmailAuth() {
  const init = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/identityPlatform:initializeAuth`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );
  console.log("Initialize auth:", init.status, init.ok ? "OK" : (await init.text()).slice(0, 200));

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired,authorizedDomains`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signIn: { email: { enabled: true, passwordRequired: true } },
        authorizedDomains: [
          "localhost",
          "127.0.0.1",
          `${projectId}.firebaseapp.com`,
          `${projectId}.web.app`,
        ],
      }),
    }
  );
  const text = await res.text();
  console.log("Enable email auth:", res.status, text.slice(0, 300));
  return res.ok;
}

enableEmailAuth().catch(console.error);
