import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { PostIntent } from '../stores/postComposerStore';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';

type Styles = CreatePostComposerModalStyles;

export type ComposerGiveRequestToggleProps = Readonly<{
  styles: Styles;
  intent: PostIntent;
  giveLabel: string;
  requestLabel: string;
  onGive: () => void;
  onRequest: () => void;
}>;

export default function ComposerGiveRequestToggle({
  styles: s,
  intent,
  giveLabel,
  requestLabel,
  onGive,
  onRequest,
}: ComposerGiveRequestToggleProps): React.ReactElement {
  return (
    <View style={s.toggleRow}>
      <TouchableOpacity style={[s.toggleBtn, intent === 'give' && s.toggleBtnActive]} onPress={onGive}>
        <Text style={[s.toggleText, intent === 'give' && s.giveTextActive]}>{giveLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.toggleBtn, intent === 'request' && s.toggleBtnActive]} onPress={onRequest}>
        <Text style={[s.toggleText, intent === 'request' && s.requestTextActive]}>{requestLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
