const OWNER = "wan-ship-qq";
const REPO = "podarkino-landing";
const BRANCH = "main";
const ALLOWED_ORIGIN = "https://wan-ship-qq.github.io";
const ALLOWED_PATHS = new Set(["data/products.json", "data/content.json"]);
const MAX_IMAGE_BASE64_LENGTH = 8 * 1024 * 1024;
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
  if (origin === ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin)
    }
  });
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function createSession(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = crypto.randomUUID();
  const payload = `${expires}.${nonce}`;
  return `${payload}.${base64Url(await hmac(payload, secret))}`;
}

async function validSession(request, secret) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expires, nonce, signature] = parts;
  if (!/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  if (!nonce || !signature) return false;

  const expected = base64Url(await hmac(`${expires}.${nonce}`, secret));
  return constantTimeEqual(encoder.encode(signature), encoder.encode(expected));
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "podarkino-admin-api"
  };
}

function githubUrl(path) {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
}

function utf8ToBase64(value) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function githubFile(path, token) {
  const response = await fetch(`${githubUrl(path)}?ref=${BRANCH}`, {
    headers: githubHeaders(token)
  });
  if (!response.ok) throw new Error(`GitHub read failed: ${response.status}`);
  return response.json();
}

async function updateGithubFile(path, data, message, token) {
  if (!ALLOWED_PATHS.has(path)) throw new Error("Path is not allowed");
  const current = await githubFile(path, token);
  const response = await fetch(githubUrl(path), {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      branch: BRANCH,
      sha: current.sha,
      content: utf8ToBase64(`${JSON.stringify(data, null, 2)}\n`)
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub write failed: ${response.status}`);
  }
}

function safeAssetName(filename) {
  const base = String(filename || "photo")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "photo";
  return `assets/admin/${base}-${crypto.randomUUID()}.webp`;
}

async function uploadGithubImage(filename, content, token) {
  if (typeof content !== "string" || !content || content.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error("Изображение пустое или слишком большое");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(content)) throw new Error("Некорректное изображение");
  const path = safeAssetName(filename);
  const response = await fetch(githubUrl(path), {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload product image ${path.split("/").pop()}`,
      branch: BRANCH,
      content
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub image upload failed: ${response.status}`);
  }
  return path;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "Origin denied" }, 403, origin);

    const url = new URL(request.url);

    if (url.pathname === "/login" && request.method === "POST") {
      if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
        return json({ error: "Секреты Worker ещё не настроены" }, 503, origin);
      }
      const body = await request.json().catch(() => ({}));
      const supplied = await sha256(String(body.password || ""));
      const expected = await sha256(env.ADMIN_PASSWORD || "");
      if (!env.ADMIN_PASSWORD || !constantTimeEqual(supplied, expected)) {
        return json({ error: "Неверный пароль" }, 401, origin);
      }
      return json({ token: await createSession(env.SESSION_SECRET) }, 200, origin);
    }

    if (!env.SESSION_SECRET || !(await validSession(request, env.SESSION_SECRET))) {
      return json({ error: "Требуется вход" }, 401, origin);
    }

    if (url.pathname === "/data" && request.method === "GET") {
      try {
        const [productsFile, contentFile] = await Promise.all([
          githubFile("data/products.json", env.GITHUB_TOKEN),
          githubFile("data/content.json", env.GITHUB_TOKEN)
        ]);
        const decode = (value) => JSON.parse(new TextDecoder().decode(
          Uint8Array.from(atob(value.replace(/\n/g, "")), (char) => char.charCodeAt(0))
        ));
        return json({
          products: decode(productsFile.content),
          content: decode(contentFile.content)
        }, 200, origin);
      } catch (error) {
        return json({ error: error.message }, 502, origin);
      }
    }

    if (url.pathname === "/data" && request.method === "PUT") {
      const body = await request.json().catch(() => null);
      if (!body || !Array.isArray(body.products) || typeof body.content !== "object") {
        return json({ error: "Некорректные данные" }, 400, origin);
      }
      try {
        await updateGithubFile(
          "data/products.json",
          body.products,
          "Update products from password admin",
          env.GITHUB_TOKEN
        );
        await updateGithubFile(
          "data/content.json",
          body.content,
          "Update content from password admin",
          env.GITHUB_TOKEN
        );
        return json({ ok: true }, 200, origin);
      } catch (error) {
        return json({ error: error.message }, 502, origin);
      }
    }

    if (url.pathname === "/image" && request.method === "PUT") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body.filename !== "string" || typeof body.content !== "string") {
        return json({ error: "Некорректное изображение" }, 400, origin);
      }
      try {
        const path = await uploadGithubImage(body.filename, body.content, env.GITHUB_TOKEN);
        return json({ ok: true, path }, 200, origin);
      } catch (error) {
        return json({ error: error.message }, 502, origin);
      }
    }

    return json({ error: "Not found" }, 404, origin);
  }
};
