import { usePostComposerStore } from '../postComposerStore';

describe('usePostComposerStore', () => {
  beforeEach(() => {
    usePostComposerStore.setState({
      visible: false,
      initialIntent: 'give',
      initialCategory: 'items',
      composerMode: 'post',
    });
  });

  it('defaults to post mode when mode omitted', () => {
    usePostComposerStore.getState().openComposer({ intent: 'give', category: 'money' });
    const s = usePostComposerStore.getState();
    expect(s.visible).toBe(true);
    expect(s.composerMode).toBe('post');
    expect(s.initialCategory).toBe('money');
  });

  it('sets task mode when requested', () => {
    usePostComposerStore.getState().openComposer({ intent: 'give', category: 'items', mode: 'task' });
    const s = usePostComposerStore.getState();
    expect(s.composerMode).toBe('task');
    expect(s.visible).toBe(true);
  });
});
