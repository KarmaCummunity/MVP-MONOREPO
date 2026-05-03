// File overview:
// - Purpose: Home tab root — main posts feed (same UI as `PostsReelsScreen`).
// - Reached from: `HomeTabStack` -> route 'HomeMain' (initial route of the Home tab).
// - Provides: Full feed via `PostsReelsScreen` including floating feed header (stats, filters, friends/discovery); toasts overlay.
// - Reads from context: `useToast` only.
// - External deps: `PostsReelsScreen` (Feed UI).
import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import colors from "../globals/colors";
import { useToast } from "../utils/toastService";
import { useLogScreenOpened } from "../hooks/useLogScreenOpened";
import PostsReelsScreen from "../components/PostsReelsScreen";

export default function HomeScreen() {
  const { ToastComponent } = useToast();

  /** Stack route name is `HomeMain`; keep log label aligned with navigation state. */
  useLogScreenOpened("HomeMain");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <PostsReelsScreen />
      {ToastComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
