// File overview:
// - Purpose: Home tab root screen showing placeholder copy (product request).
// - Reached from: `HomeTabStack` -> route 'HomeMain' (initial route of the Home tab).
// - Provides: Simple centered message; posts/reels feed remains on `PostsReelsScreen` route / modal.
// - Reads from context: `useToast` only.
// - External deps/services: none beyond RN primitives.
import React from "react";
import { SafeAreaView, StyleSheet, StatusBar, Text, View } from "react-native";
import colors from "../globals/colors";
import { useToast } from "../utils/toastService";
import { useLogScreenOpened } from "../hooks/useLogScreenOpened";

export default function HomeScreen() {
  const { ToastComponent } = useToast();

  /** Stack route name is `HomeMain`; keep log label aligned with navigation state. */
  useLogScreenOpened("HomeMain");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.center}>
        <Text style={styles.title}>זה המסך בית</Text>
      </View>
      {ToastComponent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    color: colors.textPrimary,
  },
});
