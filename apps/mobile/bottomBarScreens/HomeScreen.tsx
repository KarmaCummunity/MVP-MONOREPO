// File overview:
// - Purpose: New simplified Home screen that shows only Posts and Reels feed
// - Reached from: `HomeTabStack` -> route 'HomeMain' (initial route of the Home tab).
// - Provides: Direct access to posts feed with friends/discovery toggle
// - Reads from context: `PostsReelsScreen` / `useToast`; feed reads `useUser` internally.
// - External deps/services: `PostsReelsScreen`
import React from "react";
import { SafeAreaView, StyleSheet, StatusBar } from "react-native";
import PostsReelsScreen from "../components/PostsReelsScreen";
import colors from "../globals/colors";
import { useToast } from "../utils/toastService";
import { useLogScreenOpened } from "../hooks/useLogScreenOpened";
import { logger } from "../utils/loggerService";

export default function HomeScreen() {
  const { ToastComponent } = useToast();

  /** Stack route name is `HomeMain`; keep log label aligned with navigation state. */
  useLogScreenOpened("HomeMain");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <PostsReelsScreen
        onScroll={(hide) => {
          logger.debug("HomeScreen", "PostsReelsScreen scroll", { hide });
        }}
        hideTopBar={false}
        showTopBar={true}
      />
      {ToastComponent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
