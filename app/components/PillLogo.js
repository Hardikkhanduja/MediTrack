import { View } from "react-native";

export default function PillLogo({
  size = 18,
  colorLeft = "#8b7cff",
  colorRight = "#4b4ba3",
  rotate = "-35deg",
}) {
  return (
    <View
      style={{
        width: size * 1.8,
        height: size,
        borderRadius: size / 2,
        flexDirection: "row",
        overflow: "hidden",
        transform: [{ rotate }],
      }}
    >
      {/* Left Half */}
      <View
        style={{
          flex: 1,
          backgroundColor: colorLeft,
          borderTopLeftRadius: size / 2,
          borderBottomLeftRadius: size / 2,
        }}
      />

      {/* Right Half */}
      <View
        style={{
          flex: 1,
          backgroundColor: colorRight,
          borderTopRightRadius: size / 2,
          borderBottomRightRadius: size / 2,
        }}
      />
    </View>
  );
}