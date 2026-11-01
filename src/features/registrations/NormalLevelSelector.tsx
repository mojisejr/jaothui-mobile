import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { EventButton } from "@/features/events/EventControls";
import { normalClassOptions, type NormalClassOptions, type NormalCompetitionLevel } from "./normalLevels";
import { formStyles } from "./FormControls";

const labels = { ประเทศ: "ระดับประเทศ", จังหวัด: "ระดับจังหวัด / ท้องถิ่น" };
const levels = ["ประเทศ", "จังหวัด"] as const;

export function NormalLevelSelector({ options, level, age, disabled, onChange }: {
  options: NormalClassOptions; level: string; age: number | null; disabled: boolean;
  onChange: (level: NormalCompetitionLevel) => void;
}) {
  const total = (value: string) => {
    const choices = normalClassOptions(options, value);
    return choices.regular.length + choices.special.length;
  };
  const currentLevel = levels.find(value => value === level);
  const alternative = levels.find(value => value !== level && total(value) > 0);
  const emptySelection = age !== null && currentLevel && total(level) === 0;
  return <View style={styles.container}>
    <View accessibilityRole="radiogroup" accessibilityLabel="ระดับการแข่งขัน" style={styles.options}>
      {levels.map(value => {
        const selected = level === value, choices = normalClassOptions(options, value);
        const summary = age === null ? "เลือกวันเกิดเพื่อดูรุ่นแข่งขัน"
          : total(value) === 0 ? `ไม่มีรุ่นที่ตรงกับอายุ ${age} เดือน`
            : `รุ่นตามอายุ ${choices.regular.length} · รุ่นพิเศษ ${choices.special.length}`;
        return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={labels[value]} accessibilityHint={summary}
          accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => onChange(value)}
          style={({ pressed }) => [styles.option, selected && styles.selected, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
          <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.dot} /> : null}</View>
          <View style={styles.content}>
            <Text style={[styles.title, selected && styles.selectedTitle]}>{labels[value]}</Text>
            <Text style={formStyles.hint}>{summary}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    {emptySelection && currentLevel && alternative ? <View style={styles.guidance}>
      <Text accessibilityLiveRegion="polite" style={formStyles.body}>งานนี้ไม่มีรุ่น{labels[currentLevel]}ที่ตรงกับอายุ {age} เดือน ดูรุ่นที่เข้าเกณฑ์ได้ที่{labels[alternative]}</Text>
      <EventButton secondary label={`ดูรุ่น${labels[alternative]}`} disabled={disabled} onPress={() => onChange(alternative)} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginBottom: spacing.md }, options: { gap: spacing.xs },
  option: { width: "100%", minHeight: spacing.touchTarget, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  selected: { borderColor: colors.gold, backgroundColor: colors.surfaceRaised },
  radio: { width: spacing.lg, height: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.muted, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.gold, backgroundColor: colors.gold }, dot: { width: spacing.xs, height: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.background },
  content: { flex: 1, minWidth: 0, gap: spacing.xxs }, title: { ...typography.cardTitle, color: colors.foreground }, selectedTitle: { color: colors.gold },
  guidance: { gap: spacing.sm }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.82 },
});
