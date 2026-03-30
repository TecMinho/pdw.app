import React from "react";
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
          borderColor: "#ccc",
          borderRadius: 5,
          paddingHorizontal: 10,
          justifyContent: "center",
          marginBottom: 10,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ color: value ? "#111" : "#999", fontSize: 16 }}>
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
              borderColor: "#d4d4d4",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? "#f0f0f0" : "#fff",
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>
              {key}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
