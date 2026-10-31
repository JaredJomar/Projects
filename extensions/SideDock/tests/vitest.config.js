module.exports = {
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"],
    exclude: ["e2e/**"],
    globals: true,
    clearMocks: true,
    restoreMocks: true
  }
};
