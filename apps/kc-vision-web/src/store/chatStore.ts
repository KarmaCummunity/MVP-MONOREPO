import { create } from 'zustand'
import {
  VISION_CHAT_MESSAGES,
  type VisionChatMessage,
} from '../fixtures/chat.fixtures'

interface ChatState {
  messages: VisionChatMessage[]
  sendMessage: (m: VisionChatMessage) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [...VISION_CHAT_MESSAGES],
  sendMessage: (m) => set({ messages: [...get().messages, m] }),
}))
