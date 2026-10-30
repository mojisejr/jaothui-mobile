// Normal selector semantics from jaothui-event ed3f22ac (normal-competition-levels.ts).
export type NormalCompetitionLevel = "ประเทศ" | "จังหวัด";
export type NormalClassOptions = {
  nationalTypes: string[];
  provinceTypes: string[];
  specialNationalTypes: string[];
  specialProvinceTypes: string[];
};
export const emptyNormalClassOptions: NormalClassOptions = {
  nationalTypes: [],
  provinceTypes: [],
  specialNationalTypes: [],
  specialProvinceTypes: [],
};
/** These are already eligible display labels from the authoritative catalog API. */
export function normalClassOptions(options: NormalClassOptions, level: string) {
  return level === "ประเทศ"
    ? { regular: options.nationalTypes, special: options.specialNationalTypes }
    : level === "จังหวัด"
      ? {
          regular: options.provinceTypes,
          special: options.specialProvinceTypes,
        }
      : { regular: [], special: [] };
}
export function reconcileNormalSelection(
  selection: { level: string; type: string },
  options: NormalClassOptions,
  previousLevel = selection.level,
) {
  const classes = normalClassOptions(options, selection.level);
  return {
    ...selection,
    type:
      previousLevel === selection.level &&
      [...classes.regular, ...classes.special].includes(selection.type)
        ? selection.type
        : "",
  };
}
/** National first; province is the applicant's later choice. Regular classes outrank SP-only levels. */
export function defaultNormalLevel(
  options: NormalClassOptions,
): NormalCompetitionLevel | "" {
  if (options.nationalTypes.length) return "ประเทศ";
  if (options.provinceTypes.length) return "จังหวัด";
  if (options.specialNationalTypes.length) return "ประเทศ";
  if (options.specialProvinceTypes.length) return "จังหวัด";
  return "";
}
/** Fills an empty level and a missing class with the age class; SP is never chosen automatically. */
export function suggestNormalSelection(
  selection: { level: string; type: string },
  options: NormalClassOptions,
  previousLevel = selection.level,
) {
  const level = selection.level || defaultNormalLevel(options);
  const kept = reconcileNormalSelection(
    { level, type: selection.type },
    options,
    previousLevel,
  );
  return {
    level,
    type: kept.type || (normalClassOptions(options, level).regular[0] ?? ""),
  };
}
export const nextNormalLevel = (level: string): NormalCompetitionLevel =>
  level === "ประเทศ" ? "จังหวัด" : "ประเทศ";
