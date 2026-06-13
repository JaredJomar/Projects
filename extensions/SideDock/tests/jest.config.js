module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/setup.js"],
  testMatch: ["**/?(*.)+(test).js"],
  moduleFileExtensions: ["js"],
  clearMocks: true,
  restoreMocks: true,
  verbose: true
};
