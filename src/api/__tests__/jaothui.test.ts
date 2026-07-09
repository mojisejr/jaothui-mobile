import { buildBuffaloQueryString } from "@/api/jaothui";

describe("buildBuffaloQueryString", () => {
  it("uses stable default list query params", () => {
    expect(buildBuffaloQueryString()).toBe("page=1&sortBy=latest");
  });

  it("omits all-filter values and trims search/age values", () => {
    expect(
      buildBuffaloQueryString({
        page: 2,
        search: " หมูตุ๋น ",
        sex: "all",
        color: "black",
        ageOperator: ">=",
        ageValue: " 18 ",
        sortBy: "youngest",
      })
    ).toBe(
      "page=2&sortBy=youngest&search=%E0%B8%AB%E0%B8%A1%E0%B8%B9%E0%B8%95%E0%B8%B8%E0%B9%8B%E0%B8%99&color=black&ageOperator=%3E%3D&ageValue=18"
    );
  });

  it("does not send age operator without an age value", () => {
    expect(buildBuffaloQueryString({ ageOperator: "<=", ageValue: " " })).toBe("page=1&sortBy=latest");
  });
});
