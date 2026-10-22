module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Task archives are preserved, but must not become duplicate app/test roots.
  modulePathIgnorePatterns: ["<rootDir>/.tmp/"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/.tmp/"],
};
