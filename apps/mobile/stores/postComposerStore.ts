import { create } from 'zustand';

export type PostIntent = 'give' | 'request';

interface PostComposerState {
  visible: boolean;
  initialIntent: PostIntent;
  initialCategory: string;
  openComposer: (params?: { intent?: PostIntent; category?: string }) => void;
  closeComposer: () => void;
}

export const usePostComposerStore = create<PostComposerState>((set) => ({
  visible: false,
  initialIntent: 'give',
  initialCategory: 'items',
  openComposer: (params) =>
    set({
      visible: true,
      initialIntent: params?.intent ?? 'give',
      initialCategory: params?.category ?? 'items',
    }),
  closeComposer: () => set({ visible: false }),
}));
