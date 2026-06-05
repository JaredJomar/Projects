const { INITIAL_SITE_LIST } = require("../src/constants.js");

test("initial site list starts empty", () => {
  expect(INITIAL_SITE_LIST).toEqual([]);
});
