import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getBuffalos } from "@/api/jaothui";
import { AppShell } from "@/components/AppShell";
import { BuffaloCard } from "@/components/BuffaloCard";
import { StateBlock } from "@/components/StateBlock";
import { bottomNav, colors, radius, shadow, spacing } from "@/design/tokens";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type {
  MobileBuffaloAgeOperator,
  MobileBuffaloCard,
  MobileBuffaloQuery,
} from "@/types/mobile-api";

const EMPTY_BUFFALOS: MobileBuffaloCard[] = [];
const DEFAULT_FILTER: Required<Pick<MobileBuffaloQuery, "sex" | "color" | "ageOperator" | "ageValue" | "sortBy">> = {
  sex: "all",
  color: "all",
  ageOperator: ">=",
  ageValue: "",
  sortBy: "latest",
};

type FilterState = typeof DEFAULT_FILTER;
type ActiveChip = { key: keyof FilterState | "search"; label: string };

const MICROCHIP_PATTERN = /^\d{12,}$/;

export function BuffaloListScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadBuffalos = useCallback(
    () =>
      getBuffalos({
        page,
        search,
        ...filter,
      }),
    [filter, page, search]
  );
  const state = useAsyncResource(loadBuffalos);

  const patchFilter = useCallback((patch: Partial<FilterState>) => {
    setFilter((current) => ({ ...current, ...patch }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilter(DEFAULT_FILTER);
    setSearchInput("");
    setSearch("");
    setPage(1);
  }, []);

  const activeChips = useMemo(() => getActiveChips(filter, search), [filter, search]);
  const clearChip = useCallback(
    (key: ActiveChip["key"]) => {
      if (key === "search") {
        setSearchInput("");
        setSearch("");
        setPage(1);
        return;
      }
      if (key === "ageValue") patchFilter({ ageValue: "" });
      else patchFilter({ [key]: DEFAULT_FILTER[key] } as Partial<FilterState>);
    },
    [patchFilter]
  );

  const keyExtractor = useCallback(
    (buffalo: MobileBuffaloCard) => `${buffalo.tokenId ?? "token"}-${buffalo.microchip}`,
    []
  );

  const renderBuffalo = useCallback(
    ({ item }: { item: MobileBuffaloCard }) => (
      <BuffaloCard
        buffalo={item}
        onPress={() => {
          if (!MICROCHIP_PATTERN.test(item.microchip)) return;
          router.push({
            pathname: "/certs/[microchip]",
            params: { microchip: item.microchip },
          });
        }}
      />
    ),
    [router]
  );

  const listData = state.status === "success" ? state.data.items : EMPTY_BUFFALOS;
  const totalPages = state.status === "success" ? state.data.pagination.totalPages : 1;
  const totalCount = state.status === "success" ? state.data.pagination.totalCount : 0;

  return (
    <AppShell activeTab="buffalo" scroll={false}>
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderBuffalo}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          <ListHeader
            activeChips={activeChips}
            filter={filter}
            filterOpen={filterOpen}
            page={state.status === "success" ? state.data.pagination.page : page}
            searchInput={searchInput}
            totalCount={totalCount}
            totalPages={totalPages}
            status={state.status}
            errorMessage={state.status === "error" ? state.error.message : null}
            onClearChip={clearChip}
            onFilterToggle={() => setFilterOpen((open) => !open)}
            onFilterPatch={patchFilter}
            onResetFilters={resetFilters}
            onRetry={state.reload}
            onSearchChange={setSearchInput}
          />
        }
        ListEmptyComponent={
          state.status === "success" ? (
            <StateBlock
              title="ไม่พบกระบือ"
              message="ลองค้นหาด้วยคำอื่น หรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
              actionLabel="ล้างตัวกรอง"
              onAction={resetFilters}
            />
          ) : null
        }
        ListFooterComponent={
          state.status === "success" && totalPages > 1 ? (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          ) : null
        }
      />
    </AppShell>
  );
}

type ListHeaderProps = {
  activeChips: ActiveChip[];
  filter: FilterState;
  filterOpen: boolean;
  page: number;
  searchInput: string;
  status: "loading" | "success" | "error";
  totalCount: number;
  totalPages: number;
  errorMessage: string | null;
  onClearChip: (key: ActiveChip["key"]) => void;
  onFilterToggle: () => void;
  onFilterPatch: (patch: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
};

function ListHeader({
  activeChips,
  filter,
  filterOpen,
  page,
  searchInput,
  status,
  totalCount,
  totalPages,
  errorMessage,
  onClearChip,
  onFilterToggle,
  onFilterPatch,
  onResetFilters,
  onRetry,
  onSearchChange,
}: ListHeaderProps) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>NFT เพชรดีกรี</Text>
            <Text style={styles.subtitle}>ค้นหาและกรองกระบือจาก Mobile BFF API</Text>
          </View>
          <Pressable
            accessibilityLabel="ตัวกรอง"
            accessibilityRole="button"
            style={[styles.filterButton, activeChips.length > 0 ? styles.filterButtonActive : null]}
            onPress={onFilterToggle}
          >
            <Text style={styles.filterIcon}>≡</Text>
            {activeChips.length > 0 ? (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeChips.length}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>ค้น</Text>
          <TextInput
            accessibilityLabel="ค้นหาเลขชิปหรือชื่อควาย"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={onSearchChange}
            placeholder="ค้นหาเลขชิป, ชื่อควาย"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchInput}
          />
        </View>

        {activeChips.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {activeChips.map((chip) => (
                <Chip key={chip.key} label={`${chip.label} ×`} onPress={() => onClearChip(chip.key)} />
              ))}
              <Chip label="ล้างทั้งหมด" tone="muted" onPress={onResetFilters} />
            </View>
          </ScrollView>
        ) : null}

        {filterOpen ? <FilterPanel filter={filter} onChange={onFilterPatch} onReset={onResetFilters} /> : null}

        {status === "loading" ? (
          <StateBlock title="กำลังโหลดรายการ" message="กำลังเรียก /api/mobile/v1/buffalos" />
        ) : null}

        {status === "error" ? (
          <StateBlock
            title="โหลดรายการไม่สำเร็จ"
            message={errorMessage || "กรุณาลองใหม่อีกครั้ง"}
            actionLabel="ลองใหม่"
            onAction={onRetry}
          />
        ) : null}

        {status === "success" ? (
          <Text style={styles.resultText}>
            หน้า {page} จาก {totalPages} · {totalCount} รายการ
          </Text>
        ) : null}
      </View>
    </>
  );
}

function FilterPanel({
  filter,
  onChange,
  onReset,
}: {
  filter: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}) {
  return (
    <View style={styles.filterPanel}>
      <Segmented
        label="เพศ"
        value={filter.sex}
        options={[
          { value: "all", label: "ทั้งหมด" },
          { value: "female", label: "เพศเมีย" },
          { value: "male", label: "เพศผู้" },
        ]}
        onSelect={(value) => onChange({ sex: value })}
      />
      <Segmented
        label="สี"
        value={filter.color}
        options={[
          { value: "all", label: "ทั้งหมด" },
          { value: "black", label: "สีดำ" },
          { value: "albino", label: "เผือก" },
        ]}
        onSelect={(value) => onChange({ color: value })}
      />
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>อายุ (เดือน)</Text>
        <View style={styles.ageRow}>
          <View style={styles.operatorGrid}>
            {([">=", ">", "=", "<", "<="] as MobileBuffaloAgeOperator[]).map((operator) => (
              <Pill
                key={operator}
                active={filter.ageOperator === operator}
                label={operator}
                onPress={() => onChange({ ageOperator: operator })}
              />
            ))}
          </View>
          <TextInput
            accessibilityLabel="จำนวนเดือน"
            keyboardType="number-pad"
            onChangeText={(value) => onChange({ ageValue: value.replace(/[^0-9]/g, "") })}
            placeholder="เดือน"
            placeholderTextColor={colors.muted}
            style={styles.ageInput}
            value={filter.ageValue}
          />
        </View>
      </View>
      <Segmented
        label="เรียงลำดับ"
        value={filter.sortBy}
        options={[
          { value: "latest", label: "ล่าสุด" },
          { value: "oldest", label: "เก่าสุด" },
          { value: "youngest", label: "อายุน้อยสุด" },
        ]}
        onSelect={(value) => onChange({ sortBy: value })}
      />
      <Pressable accessibilityRole="button" style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetButtonText}>ล้างตัวกรอง</Text>
      </Pressable>
    </View>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((option) => (
          <Pill
            key={option.value}
            active={option.value === value}
            label={option.label}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function Pill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.pill, active ? styles.pillActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, onPress, tone = "gold" }: { label: string; onPress: () => void; tone?: "gold" | "muted" }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.chip, tone === "muted" ? styles.chipMuted : null]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, tone === "muted" ? styles.chipTextMuted : null]}>{label}</Text>
    </Pressable>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const items = pageWindow(page, totalPages);

  return (
    <View style={styles.pagination}>
      <Pressable
        accessibilityLabel="ก่อนหน้า"
        accessibilityRole="button"
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        style={[styles.pageArrow, page <= 1 ? styles.pageDisabled : null]}
      >
        <Text style={styles.pageArrowText}>‹</Text>
      </Pressable>
      {items.map((item, index) =>
        item === "…" ? (
          <Text key={`gap-${index}`} style={styles.pageGap}>
            …
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: item === page }}
            key={item}
            onPress={() => onChange(item)}
            style={[styles.pageButton, item === page ? styles.pageButtonActive : null]}
          >
            <Text style={[styles.pageText, item === page ? styles.pageTextActive : null]}>{item}</Text>
          </Pressable>
        )
      )}
      <Pressable
        accessibilityLabel="ถัดไป"
        accessibilityRole="button"
        disabled={page >= totalPages}
        onPress={() => onChange(page + 1)}
        style={[styles.pageArrow, page >= totalPages ? styles.pageDisabled : null]}
      >
        <Text style={styles.pageArrowText}>›</Text>
      </Pressable>
    </View>
  );
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

function getActiveChips(filter: FilterState, search: string): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (search.trim()) chips.push({ key: "search", label: `ค้นหา: ${search.trim()}` });
  if (filter.sex !== "all") chips.push({ key: "sex", label: filter.sex === "female" ? "เพศเมีย" : "เพศผู้" });
  if (filter.color !== "all") chips.push({ key: "color", label: filter.color === "black" ? "สีดำ" : "เผือก" });
  if (filter.ageValue.trim()) chips.push({ key: "ageValue", label: `อายุ ${filter.ageOperator} ${filter.ageValue} เดือน` });
  if (filter.sortBy !== "latest")
    chips.push({ key: "sortBy", label: filter.sortBy === "oldest" ? "เก่าสุด" : "อายุน้อยสุด" });
  return chips;
}

function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  const pages: (number | "…")[] = [1];
  if (start > 2) pages.push("…");
  for (let next = start; next <= end; next += 1) pages.push(next);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: bottomNav.contentPaddingBottom,
    paddingHorizontal: spacing.screenX,
  },
  header: {
    paddingTop: 18,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: 18,
  },
  titleCopy: {
    flex: 1,
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  filterButton: {
    alignItems: "center",
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: spacing.touchTarget,
    justifyContent: "center",
    position: "relative",
    width: spacing.touchTarget,
  },
  filterButtonActive: {
    borderColor: colors.gold,
  },
  filterIcon: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  filterCount: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    minWidth: 18,
    paddingHorizontal: 5,
    position: "absolute",
    right: -3,
    top: -3,
  },
  filterCountText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: "900",
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  searchInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 15,
    minWidth: 0,
    paddingVertical: 12,
  },
  chipScroll: {
    marginHorizontal: -spacing.screenX,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.screenX,
  },
  chip: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipMuted: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
  },
  chipText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "800",
  },
  chipTextMuted: {
    color: colors.muted,
  },
  filterPanel: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    ...shadow.raised,
  },
  filterGroup: {
    gap: spacing.sm,
  },
  filterLabel: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  pillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  pillTextActive: {
    color: colors.background,
    fontWeight: "900",
  },
  ageRow: {
    gap: spacing.sm,
  },
  operatorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  ageInput: {
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  resetButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  resetButtonText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  resultText: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
    marginTop: 20,
  },
  row: {
    gap: 12,
  },
  rowSeparator: {
    height: 12,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingTop: spacing.xl,
  },
  pageArrow: {
    alignItems: "center",
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  pageArrowText: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },
  pageDisabled: {
    opacity: 0.35,
  },
  pageButton: {
    alignItems: "center",
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    minWidth: 38,
    paddingHorizontal: 8,
  },
  pageButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  pageText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  pageTextActive: {
    color: colors.background,
  },
  pageGap: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 2,
  },
});
