import { Pressable, Text, View } from "react-native";

interface PreAuthorizedCodeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

const KEYS: Array<string | number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "C"];

export default function PreAuthorizedCodeInput({
  value,
  onChangeText,
  maxLength = 8,
  placeholder = "1234",
}: PreAuthorizedCodeInputProps) {
  const onKeyPress = (key: string | number) => {
    if (key === "⌫") {
      onChangeText(value.slice(0, -1));
      return;
    }

    if (key === "C") {
      onChangeText("");
      return;
    }

    if (value.length >= maxLength) {
      return;
    }

    onChangeText(`${value}${key}`);
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          minHeight: 40,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          borderRadius: 5,
          paddingHorizontal: 10,
          justifyContent: "center",
          marginBottom: 10,
          backgroundColor: "#101418",
        }}
      >
        <Text style={{ color: value ? "#F8FAFC" : "#6B7280", fontSize: 16 }}>
          {value || placeholder}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {KEYS.map((key) => (
          <Pressable
            key={String(key)}
            onPress={() => onKeyPress(key)}
            style={({ pressed }) => ({
              width: "31%",
              minHeight: 42,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? "#1A2027" : "#101418",
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#E5E7EB" }}>
              {key}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
