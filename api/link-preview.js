const MAX_PREVIEW_BYTES = 250_000;
const PREVIEW_TIMEOUT_MS = 5_000;

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL obrigatoria." });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "URL invalida." });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Protocolo invalido." });
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return res.status(400).json({ error: "URL nao permitida." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS);

  try {
    const response = await fetchPreview(parsedUrl, controller.signal);

    if (!response.ok) {
      return res.status(502).json({ error: "Nao foi possivel carregar o link." });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return res.status(415).json({ error: "Tipo de conteudo nao suportado." });
    }

    const html = await readLimitedText(response);

    const getMeta = (property) => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`, "i"),
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`, "i")
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return decodeHtml(match[1]);
      }

      return "";
    };

    const title =
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ||
      parsedUrl.hostname;

    const description =
      getMeta("og:description") ||
      getMeta("twitter:description") ||
      "";

    const image =
      getMeta("og:image") ||
      getMeta("twitter:image") ||
      "";

    const siteName =
      getMeta("og:site_name") ||
      parsedUrl.hostname.replace("www.", "");

    return res.status(200).json({
      url: parsedUrl.toString(),
      provider: siteName,
      title: cleanText(title),
      description: cleanText(description),
      image,
      icon: getProviderIcon(parsedUrl.hostname)
    });
  } catch (error) {
    console.error("Erro no preview:", error);
    return res.status(500).json({ error: "Erro ao gerar preview." });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPreview(parsedUrl, signal, redirectCount = 0) {
  const response = await fetch(parsedUrl.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 VinylBot/1.0",
      Accept: "text/html,application/xhtml+xml"
    },
    redirect: "manual",
    signal
  });

  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    if (redirectCount >= 3) {
      throw new Error("Redirecionamentos demais.");
    }

    const nextUrl = new URL(response.headers.get("location"), parsedUrl);

    if (!["http:", "https:"].includes(nextUrl.protocol) || isBlockedHostname(nextUrl.hostname)) {
      throw new Error("Redirecionamento nao permitido.");
    }

    return fetchPreview(nextUrl, signal, redirectCount + 1);
  }

  return response;
}

async function readLimitedText(response) {
  const reader = response.body?.getReader();

  if (!reader) {
    const text = await response.text();

    if (text.length > MAX_PREVIEW_BYTES) {
      throw new Error("Preview muito grande.");
    }

    return text;
  }

  const decoder = new TextDecoder();
  let total = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    total += value.byteLength;

    if (total > MAX_PREVIEW_BYTES) {
      throw new Error("Preview muito grande.");
    }

    html += decoder.decode(value, { stream: true });
  }

  return html + decoder.decode();
}

function isBlockedHostname(hostname = "") {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;

  const parts = host.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168 ||
    first === 100 && second >= 64 && second <= 127
  );
}

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function decodeHtml(value = "") {
  return cleanText(value);
}

function getProviderIcon(hostname = "") {
  const host = hostname.replace("www.", "");

  if (host.includes("spotify.com")) return "SP";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YT";
  if (host.includes("soundcloud.com")) return "SC";
  if (host.includes("x.com") || host.includes("twitter.com")) return "X";
  if (host.includes("instagram.com")) return "IG";
  if (host.includes("tiktok.com")) return "TT";

  return "LINK";
}
