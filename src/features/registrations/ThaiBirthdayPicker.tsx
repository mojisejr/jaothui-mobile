import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { EventButton } from "@/features/events/EventControls";
import { parseCalendarInput } from "@/features/events/model";
import { formStyles } from "./FormControls";
import { bangkokToday, birthdayDays, birthdayParts, changeBirthdayPart, thaiMonths, validBirthday } from "./birthday";
export function ThaiBirthdayPicker({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const parts = birthdayParts(value), year = Number(bangkokToday().slice(0, 4)) + 543;
  const labels = ["วัน", "เดือน", "ปี พ.ศ."];
  const options = open === 0 ? Array.from({ length: birthdayDays(parts[1], parts[2]) }, (_, i) => String(i + 1).padStart(2, "0")) : open === 1 ? thaiMonths.map((_, i) => String(i + 1).padStart(2, "0")) : Array.from({ length: year - 2443 + 1 }, (_, i) => String(year - i));
  const day = parseCalendarInput(value).day;
  return <View style={formStyles.field}><Text style={formStyles.label}>วันเกิดกระบือ</Text><View style={formStyles.choices}>
    {labels.map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`เลือก${label}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => setOpen(index)} style={[formStyles.input, { flex: index === 1 ? 2 : 1 }]}><Text style={formStyles.body}>{parts[index] ? index === 1 ? thaiMonths[Number(parts[index]) - 1] : parts[index] : label} ▾</Text></Pressable>)}
    </View>{value && (!day || !validBirthday(day)) ? <Text style={formStyles.error}>กรุณาเลือกวันที่ให้ครบและไม่เกินวันนี้</Text> : null}
    <Modal visible={open !== null && !disabled} transparent animationType="none" onRequestClose={() => setOpen(null)}><View style={formStyles.modal}><View accessibilityViewIsModal style={[formStyles.dialog, { maxHeight: "80%" }]}><Text style={formStyles.section}>เลือก{labels[open ?? 0]}</Text><FlatList data={options} keyExtractor={item => item} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={open === 1 ? thaiMonths[Number(item) - 1] : item} style={formStyles.input} onPress={() => { if (!disabled && open !== null) onChange(changeBirthdayPart(value, open, item)); setOpen(null); }}><Text style={formStyles.body}>{open === 1 ? thaiMonths[Number(item) - 1] : item}</Text></Pressable>} /><EventButton secondary label="ยกเลิก" onPress={() => setOpen(null)} /></View></View></Modal>
  </View>;
}
