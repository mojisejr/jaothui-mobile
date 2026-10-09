import { memo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/design/tokens";

type BuffaloPhotoProps = {
  uri: string | null;
  label: string;
};

/** The parent owns a fixed frame; this primitive never crops an identity photo. */
export const BuffaloPhoto = memo(function BuffaloPhoto({ uri, label }: BuffaloPhotoProps) {
  return (
    <View style={styles.inset}>
      <PhotoSource key={uri || "missing"} uri={uri} label={label} />
    </View>
  );
});

function PhotoSource({ uri, label }: BuffaloPhotoProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={styles.fallback} accessible accessibilityRole="image" accessibilityLabel={`ไม่มีภาพ ${label}`}>
        <Text style={styles.fallbackText}>JAOTHUI</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="contain"
      accessibilityLabel={label}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  inset: {
    flex: 1,
    padding: spacing.xs,
    backgroundColor: colors.surfaceRaised,
  },
  image: {
    flex: 1,
    width: "100%",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  fallbackText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
