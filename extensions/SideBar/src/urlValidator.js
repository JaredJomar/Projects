const UNSAFE_SCHEMES = Object.freeze([
  "javascript:",
  "file:",
  "chrome:",
  "chrome-extension:",
  "data:"
]);

function hasProtocol(value) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

function formatUrl(parsedUrl) {
  const rootPath = parsedUrl.pathname === "/" && !parsedUrl.search && !parsedUrl.hash;
  const pathname = rootPath ? "" : parsedUrl.pathname;

  return `${parsedUrl.origin}${pathname}${parsedUrl.search}${parsedUrl.hash}`;
}

function normalizeSiteUrl(rawUrl) {
  if (typeof rawUrl !== "string") {
    throw new TypeError("Site URL must be a non-empty string.");
  }

  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new TypeError("Site URL must be a non-empty string.");
  }

  const candidate = hasProtocol(trimmed) ? trimmed : `https://${trimmed}`;
  let parsedUrl;

  try {
    parsedUrl = new URL(candidate);
  } catch (error) {
    throw new TypeError(`Invalid site URL: ${rawUrl}`);
  }

  if (!UNSAFE_SCHEMES.includes(`${parsedUrl.protocol}`.toLowerCase()) && parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new TypeError(`Unsupported URL scheme: ${parsedUrl.protocol}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new TypeError(`Unsupported URL scheme: ${parsedUrl.protocol}`);
  }

  return formatUrl(parsedUrl);
}

function isValidSiteUrl(rawUrl) {
  try {
    normalizeSiteUrl(rawUrl);
    return true;
  } catch (error) {
    return false;
  }
}

const urlValidator = Object.freeze({
  normalizeSiteUrl,
  isValidSiteUrl
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = urlValidator;
}

globalThis.SideBarUrlValidator = urlValidator;
