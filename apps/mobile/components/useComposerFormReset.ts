import { useEffect, useRef } from 'react';
import type { ComposerContentMode, PostIntent } from '../stores/postComposerStore';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';

const TASK_CATEGORY_SLUG = 'tasks' as const;

export type ComposerFormSetters = Readonly<{
  setIntent: (v: PostIntent) => void;
  setCategory: (v: string) => void;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setCity: (v: string) => void;
  setRideFrom: (v: string) => void;
  setRideTo: (v: string) => void;
  setRideDeparture: (v: Date | null) => void;
  setAdvancedOpen: (v: boolean) => void;
  setIsRecurring: (v: boolean) => void;
  setRecurrenceFrequency: (v: number) => void;
  setRecurrenceUnit: (v: RecurrenceUnit | null) => void;
  setSeats: (v: number) => void;
  setFuelMode: (v: 'none' | 'yes' | 'up_to') => void;
  setFuelCapNis: (v: string) => void;
  setSmokingPref: (v: 'no_smokers' | 'smokers_ok' | 'any') => void;
  setGenderPref: (v: 'any' | 'female' | 'male') => void;
  setQuantity: (v: string) => void;
  setAmount: (v: string) => void;
  setTaskSubmitting: (v: boolean) => void;
}>;

function applyComposerOpenReset(
  initialIntent: PostIntent,
  initialCategory: string,
  composerMode: ComposerContentMode,
  s: ComposerFormSetters,
): void {
  s.setIntent(initialIntent);
  s.setCategory(composerMode === 'task' ? TASK_CATEGORY_SLUG : initialCategory);
  s.setTitle('');
  s.setDescription('');
  s.setCity('');
  s.setRideFrom('');
  s.setRideTo('');
  s.setRideDeparture(new Date());
  s.setAdvancedOpen(false);
  s.setIsRecurring(false);
  s.setRecurrenceFrequency(1);
  s.setRecurrenceUnit(null);
  s.setSeats(1);
  s.setFuelMode('none');
  s.setFuelCapNis('');
  s.setSmokingPref('any');
  s.setGenderPref('any');
  s.setQuantity('1');
  s.setAmount('');
  s.setTaskSubmitting(false);
}

export function useComposerFormReset(
  visible: boolean,
  initialCategory: string,
  initialIntent: PostIntent,
  composerMode: ComposerContentMode,
  setters: ComposerFormSetters,
): void {
  const settersRef = useRef(setters);
  settersRef.current = setters;

  useEffect(() => {
    if (!visible) return;
    applyComposerOpenReset(initialIntent, initialCategory, composerMode, settersRef.current);
  }, [visible, initialCategory, initialIntent, composerMode]);
}
