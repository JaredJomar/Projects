const { normalizeSiteUrl, isValidSiteUrl } = require("../src/urlValidator.js");

describe("urlValidator", () => {
  test("normalizes a hostname without protocol to https", () => {
    expect(normalizeSiteUrl("example.com")).toBe("https://example.com");
  });

  test("accepts http and https URLs", () => {
    expect(normalizeSiteUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeSiteUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  test("rejects unsafe and malformed URLs", () => {
    expect(() => normalizeSiteUrl("")).toThrow(TypeError);
    expect(() => normalizeSiteUrl("javascript:alert(1)")).toThrow(/Unsupported URL scheme/);
    expect(() => normalizeSiteUrl("file:///tmp/test")).toThrow(/Unsupported URL scheme/);
    expect(() => normalizeSiteUrl("chrome://settings")).toThrow(/Unsupported URL scheme/);
    expect(() => normalizeSiteUrl("chrome-extension://abc123/panel.html")).toThrow(/Unsupported URL scheme/);
    expect(() => normalizeSiteUrl("data:text/plain,hello")).toThrow(/Unsupported URL scheme/);
    expect(() => normalizeSiteUrl("not a url at all")).toThrow(TypeError);
  });

  test("reports valid URLs with a boolean helper", () => {
    expect(isValidSiteUrl("example.com")).toBe(true);
    expect(isValidSiteUrl("javascript:alert(1)")).toBe(false);
  });
});
