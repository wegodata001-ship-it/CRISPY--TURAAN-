import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL;
const PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;

const authRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  }
);
const auth = await authRes.json();
if (!auth.idToken) throw new Error(JSON.stringify(auth));

async function listCollection(name) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${name}?pageSize=300`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${auth.idToken}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`${name} ${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  return (data.documents ?? []).map((doc) => {
    const id = doc.name.split("/").pop();
    const fields = {};
    for (const [key, value] of Object.entries(doc.fields ?? {})) {
      fields[key] =
        value.stringValue ??
        value.booleanValue ??
        (value.integerValue != null ? Number(value.integerValue) : undefined) ??
        (value.doubleValue != null ? Number(value.doubleValue) : undefined) ??
        (value.nullValue === null ? null : undefined) ??
        value;
    }
    return { id, ...fields };
  });
}

const categories = await listCollection("categories");
const products = await listCollection("products");
console.log("categoryCount", categories.length);
console.log("productCount", products.length);
console.log(JSON.stringify({ categories, products }, null, 2));
