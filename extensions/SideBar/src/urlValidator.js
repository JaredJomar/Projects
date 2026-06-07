((root) => {
  function getExplicitProtocol(value) {
    const match = /^([a-zA-Z][a-zA-Z\d+\-.]*):/.exec(value);

    if (!match) {
      return "";
    }

    const protocolRemainder = value.slice(match[0].length);

    if (/^\d/.test(protocolRemainder)) {
      return "";
    }

    return `${match[1].toLowerCase()}:`;
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

    const explicitProtocol = getExplicitProtocol(trimmed);
    const candidate = explicitProtocol ? trimmed : `https://${trimmed}`;
    let parsedUrl;

    try {
      parsedUrl = new URL(candidate);
    } catch (error) {
      throw new TypeError(`Invalid site URL: ${rawUrl}`);
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
    getExplicitProtocol,
    normalizeSiteUrl,
    isValidSiteUrl
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = urlValidator;
  }

  root.SideBarUrlValidator = urlValidator;
})(globalThis);
