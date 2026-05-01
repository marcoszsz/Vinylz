export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL obrigatória." });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "URL inválida." });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Protocolo inválido." });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 VinylBot/1.0",
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Não foi possível carregar o link." });
    }

    const html = await response.text();

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
  }
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

  if (host.includes("spotify.com")) return "♪";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "▶";
  if (host.includes("soundcloud.com")) return "☁";
  if (host.includes("x.com") || host.includes("twitter.com")) return "𝕏";
  if (host.includes("instagram.com")) return "◎";
  if (host.includes("tiktok.com")) return "♫";

  return "↗";
}