import { create } from 'zustand';

export type PostIntent = 'give' | 'request';

/** `post` = donation-style item; `task` = admin task (managers only in UI). */
export type ComposerContentMode = 'post' | 'task';

interface PostComposerState {
  visible: boolean;
  initialIntent: PostIntent;
  initialCategory: string;
  composerMode: ComposerContentMode;
  openComposer: (params?: {
    intent?: PostIntent;
    category?: string;
    mode?: ComposerContentMode;
  }) => void;
  closeComposer: () => void;
}

export const usePostComposerStore = create<PostComposerState>((set) => ({
  visible: false,
  initialIntent: 'give',
  initialCategory: 'items',
  composerMode: 'post',
  openComposer: (params) =>
    set({
      visible: true,
      initialIntent: params?.intent ?? 'give',
      initialCategory: params?.category ?? 'items',
      composerMode: params?.mode ?? 'post',
    }),
  closeComposer: () => set({ visible: false }),
}));
