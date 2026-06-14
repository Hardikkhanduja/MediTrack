import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ScreenContainer({
  children,
  style,
  topOffset = 12,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: insets.top + topOffset,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}