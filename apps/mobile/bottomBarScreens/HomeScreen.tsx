// File overview:
// - Purpose: New simplified Home screen that shows only Posts and Reels feed
// - Reached from: `HomeTabStack` -> route 'HomeMain' (initial route of the Home tab).
// - Provides: Direct access to posts feed with friends/discovery toggle
// - Reads from context: `useUser()` -> selectedUser, isGuestMode, isRealAuth
// - External deps/services: `PostsReelsScreen`
import React, { useEffect } from "react";
import { SafeAreaView, StyleSheet, StatusBar } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import PostsReelsScreen from "../components/PostsReelsScreen";
import colors from "../globals/colors";
import { useUser } from "../stores/userStore";
import { logger } from "../utils/loggerService";
import { useToast } from "../utils/toastService";

export default function HomeScreen() {
  const isFocused = useIsFocused();
  const { isGuestMode, selectedUser, isRealAuth } = useUser();
  const { ToastComponent } = useToast();

  useEffect(() => {
    logger.debug('HomeScreen', 'Component rendered', {
      isFocused,
      isGuestMode,
      hasUser: !!selectedUser,
      isRealAuth,
    });
  }, [isFocused, isGuestMode, selectedUser, isRealAuth]);

  useEffect(() => {
    if (isFocused) {
      logger.debug('HomeScreen', 'Screen focused');
    }
  }, [isFocused]);

  logger.debug('HomeScreen', 'Rendering HomeScreen', {
    isFocused,
    isGuestMode,
    hasUser: !!selectedUser,
    isRealAuth,
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <PostsReelsScreen
        onScroll={(hide) => {
          logger.debug('HomeScreen', 'PostsReelsScreen scroll', { hide });
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
