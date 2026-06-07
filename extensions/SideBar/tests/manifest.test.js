const fs = require("fs");
const path = require("path");

function readManifest() {
  const manifestPath = path.join(__dirname, "..", "manifest.json");

  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

test("extension action opens the native side panel rail", () => {
  const manifest = readManifest();

  expect(manifest.action.default_popup).toBeUndefined();
  expect(manifest.side_panel.default_path).toBe("src/panel.html");
  expect(manifest.permissions).toContain("sidePanel");
  expect(manifest.commands["return-to-rail"].suggested_key.default).toBe("Ctrl+B");
  expect(manifest.commands["return-to-rail"].description).toBe("Open Rail");
});
