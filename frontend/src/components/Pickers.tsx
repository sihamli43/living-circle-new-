import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, S } from "@/src/theme/colors";

export function SearchablePicker({
  visible,
  title,
  options,
  initial,
  onClose,
  onSelect,
  allowCustom,
  testID,
}: {
  visible: boolean;
  title: string;
  options: string[];
  initial?: string | null;
  onClose: () => void;
  onSelect: (value: string) => void;
  allowCustom?: boolean;
  testID?: string;
}) {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (visible) {
      setQ("");
      setCustom("");
    }
  }, [visible]);

  const filtered = q.trim()
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={testID}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} testID={`${testID}-close`}>
              <Ionicons name="close" size={24} color={C.onSurface} />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={C.onSurfaceTertiary} />
            <TextInput
              testID={`${testID}-search`}
              value={q}
              onChangeText={setQ}
              placeholder="Search"
              placeholderTextColor={C.onSurfaceTertiary}
              style={styles.search}
              autoCorrect={false}
              autoCapitalize="words"
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(o) => o}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item === initial;
              return (
                <Pressable
                  testID={`${testID}-opt-${item}`}
                  onPress={() => onSelect(item)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{item}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={C.brand} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.noResults}>No matches. {allowCustom ? "Use 'Other' below." : ""}</Text>
            }
          />
          {allowCustom && (
            <View style={styles.customWrap}>
              <Text style={styles.customLabel}>Or enter your own</Text>
              <View style={{ flexDirection: "row", gap: S.md }}>
                <TextInput
                  testID={`${testID}-custom-input`}
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="Type here"
                  placeholderTextColor={C.onSurfaceTertiary}
                  style={styles.customInput}
                  autoCapitalize="words"
                />
                <Pressable
                  testID={`${testID}-custom-add`}
                  disabled={!custom.trim()}
                  onPress={() => onSelect(custom.trim())}
                  style={[styles.customBtn, !custom.trim() && { opacity: 0.5 }]}
                >
                  <Text style={styles.customBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function MonthYearPicker({
  visible,
  initial,
  onClose,
  onSelect,
  testID,
}: {
  visible: boolean;
  initial?: string | null; // YYYY-MM-DD
  onClose: () => void;
  onSelect: (value: string) => void;
  testID?: string;
}) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() + i);
  const [day, setDay] = useState(now.getDate());
  const [mIdx, setMIdx] = useState(now.getMonth());
  const [yr, setYr] = useState(now.getFullYear());

  useEffect(() => {
    if (visible && initial && /^\d{4}-\d{2}-\d{2}$/.test(initial)) {
      const [y, m, d] = initial.split("-");
      setYr(Number(y));
      setMIdx(Number(m) - 1);
      setDay(Number(d));
    }
  }, [visible, initial]);

  // Days in current month/year (handles leap years).
  const daysInMonth = new Date(yr, mIdx + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const clampedDay = Math.min(day, daysInMonth);

  const confirm = () => {
    const mm = String(mIdx + 1).padStart(2, "0");
    const dd = String(clampedDay).padStart(2, "0");
    onSelect(`${yr}-${mm}-${dd}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={testID}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Move-in date</Text>
            <Pressable onPress={onClose} testID={`${testID}-close`}>
              <Ionicons name="close" size={24} color={C.onSurface} />
            </Pressable>
          </View>
          <View style={styles.myWrap}>
            <View style={styles.dayCol}>
              <Text style={styles.myLabel}>Day</Text>
              <ScrollView style={styles.myCol} contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
                {days.map((d) => (
                  <Pressable
                    key={d}
                    testID={`${testID}-d-${d}`}
                    onPress={() => setDay(d)}
                    style={[styles.myItem, clampedDay === d && styles.myItemActive]}
                  >
                    <Text numberOfLines={1} style={[styles.myItemText, clampedDay === d && styles.myItemTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.monthCol}>
              <Text style={styles.myLabel}>Month</Text>
              <ScrollView style={styles.myCol} contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
                {months.map((m, i) => (
                  <Pressable
                    key={m}
                    testID={`${testID}-m-${m}`}
                    onPress={() => setMIdx(i)}
                    style={[styles.myItem, mIdx === i && styles.myItemActive]}
                  >
                    <Text numberOfLines={1} style={[styles.myItemText, mIdx === i && styles.myItemTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.yearCol}>
              <Text style={styles.myLabel}>Year</Text>
              <ScrollView style={styles.myCol} contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    testID={`${testID}-y-${y}`}
                    onPress={() => setYr(y)}
                    style={[styles.myItem, yr === y && styles.myItemActive]}
                  >
                    <Text numberOfLines={1} style={[styles.myItemText, yr === y && styles.myItemTextActive]}>{y}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Pressable testID={`${testID}-confirm`} onPress={confirm} style={styles.confirmBtn}>
            <Text style={styles.confirmText}>
              Confirm {clampedDay} {months[mIdx]} {yr}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function PickerField({
  label,
  value,
  placeholder,
  onPress,
  testID,
}: {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValue}>
        <Text style={[styles.fieldValueText, !value && { color: C.onSurfaceTertiary }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.onSurfaceTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "85%", paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  handle: { width: 40, height: 4, backgroundColor: C.borderStrong, borderRadius: 2, alignSelf: "center", marginTop: S.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.sm },
  title: { fontSize: 20, fontWeight: "800", color: C.onSurface },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    marginHorizontal: S.xl, paddingHorizontal: S.lg, paddingVertical: S.md,
    backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border,
  },
  search: { flex: 1, fontSize: 15, color: C.onSurface },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.xl, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowActive: { backgroundColor: C.brandTint },
  rowText: { fontSize: 16, color: C.onSurface },
  rowTextActive: { color: C.onBrandTint, fontWeight: "700" },
  noResults: { textAlign: "center", padding: S.xl, color: C.onSurfaceTertiary },
  customWrap: { padding: S.xl, borderTopWidth: 1, borderTopColor: C.border },
  customLabel: { fontSize: 12, color: C.onSurfaceTertiary, marginBottom: S.sm, fontWeight: "600" },
  customInput: {
    flex: 1, backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 15, color: C.onSurface,
    borderWidth: 1, borderColor: C.border,
  },
  customBtn: { backgroundColor: C.brand, paddingHorizontal: S.xl, justifyContent: "center", borderRadius: R.pill },
  customBtnText: { color: C.onBrand, fontWeight: "700", fontSize: 15 },
  myWrap: { flexDirection: "row", paddingHorizontal: S.xl, gap: S.md, marginTop: S.sm },
  dayCol: { width: 56 },
  monthCol: { width: 120 },
  yearCol: { width: 72 },
  myLabel: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "700", marginBottom: S.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  myCol: { height: 260 },
  myItem: { paddingVertical: S.md, paddingHorizontal: S.sm, borderRadius: R.md, backgroundColor: C.surfaceSecondary, minHeight: 40, alignItems: "center", justifyContent: "center", marginBottom: 4, width: "100%" },
  myItemActive: { backgroundColor: C.brandTint, borderWidth: 1, borderColor: C.brand },
  myItemText: { fontSize: 14, color: C.onSurface, textAlign: "center" },
  myItemTextActive: { color: C.onBrandTint, fontWeight: "800" },
  confirmBtn: { margin: S.xl, backgroundColor: C.brand, paddingVertical: S.lg, borderRadius: R.pill, alignItems: "center" },
  confirmText: { color: C.onBrand, fontWeight: "700", fontSize: 16 },
  fieldRow: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md, padding: S.lg,
    borderWidth: 1, borderColor: C.border,
  },
  fieldLabel: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "700", marginBottom: 4 },
  fieldValue: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldValueText: { fontSize: 16, color: C.onSurface, fontWeight: "600", flex: 1 },
});
