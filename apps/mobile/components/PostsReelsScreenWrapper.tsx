// File overview:
// - Purpose: Thin wrapper to expose `PostsReelsScreen` as a stack screen with `showTopBar` defaulted to true.
// - Reached from: `MainNavigator` as modal route 'PostsReelsScreen' and from Home when opening posts feed.
// - Params: None; props forwarded to inner component; top bar visibility controlled by this wrapper.
import React from 'react';
import PostsReelsScreen from './PostsReelsScreen';

export default function PostsReelsScreenWrapper() {
  return <PostsReelsScreen showTopBar={true} />;
}
