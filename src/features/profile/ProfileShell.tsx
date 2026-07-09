import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "@/components/AppShell";
import { SettingsRow } from "@/components/SettingsRow";
import { colors, shadow, spacing } from "@/design/tokens";

export function ProfileShell() {
  return (
    <AppShell activeTab="profile">
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>จท</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>โปรไฟล์</Text>
          <Text style={styles.title}>JAOTHUI Member</Text>
          <Text style={styles.subtitle}>Public preview เปิดไว้เป็น shell ก่อน ยังไม่เชื่อม auth หรือ wallet</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>บัญชีและฟาร์ม</Text>
        <SettingsRow label="ข้อมูลสมาชิก" />
        <SettingsRow label="ข้อมูลฟาร์ม" />
        <SettingsRow label="กระเป๋า Bitkub NEXT" />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>ยังไม่ต้องเข้าสู่ระบบ</Text>
        <Text style={styles.noticeText}>
          รอบนี้เน้น public journey เท่านั้น หน้านี้จึงเป็น information architecture shell
          เพื่อให้ bottom navigation ครบโดยไม่เปิด OAuth, wallet หรือ member data.
        </Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
    padding: spacing.md,
    ...shadow.gold,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  avatarText: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: "900",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  notice: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    backgroundColor: colors.surfaceRaised,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  noticeTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
  },
  noticeText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
});
