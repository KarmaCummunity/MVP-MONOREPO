import React, { useMemo, useState, useRef } from 'react';
import { Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../stores/userStore';
import { usePostComposerStore, PostIntent } from '../stores/postComposerStore';
import { type ComposerTaskFormHandle } from './ComposerTaskForm';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';
import { createPostComposerModalStyles as styles } from './createPostComposerModalStyles';
import ComposerModalChrome from './ComposerModalChrome';
import { useComposerFormReset } from './useComposerFormReset';
import { useDedicatedPostComposerSubmit } from './useDedicatedPostComposerSubmit';

const POST_CATEGORIES = ['items', 'money', 'trump', 'knowledge', 'challenges'] as const;
const TASK_CATEGORY_SLUG = 'tasks' as const;

export default function CreatePostComposerModal(): React.ReactElement {
  const { t } = useTranslation(['common', 'donations', 'admin', 'trump']);
  const { selectedUser, isAdmin } = useUser();
  const { visible, initialCategory, initialIntent, composerMode, closeComposer } = usePostComposerStore();

  const [intent, setIntent] = useState<PostIntent>('give');
  const [category, setCategory] = useState<string>('items');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [rideFrom, setRideFrom] = useState('');
  const [rideTo, setRideTo] = useState('');
  const [rideDeparture, setRideDeparture] = useState<Date | null>(() => new Date());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit | null>(null);
  const [seats, setSeats] = useState(1);
  const [fuelMode, setFuelMode] = useState<'none' | 'yes' | 'up_to'>('none');
  const [fuelCapNis, setFuelCapNis] = useState('');
  const [smokingPref, setSmokingPref] = useState<'no_smokers' | 'smokers_ok' | 'any'>('any');
  const [genderPref, setGenderPref] = useState<'any' | 'female' | 'male'>('any');
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const taskFormRef = useRef<ComposerTaskFormHandle>(null);

  useComposerFormReset(visible, initialCategory, initialIntent, composerMode, {
    setIntent,
    setCategory,
    setTitle,
    setDescription,
    setCity,
    setRideFrom,
    setRideTo,
    setRideDeparture,
    setAdvancedOpen,
    setIsRecurring,
    setRecurrenceFrequency,
    setRecurrenceUnit,
    setSeats,
    setFuelMode,
    setFuelCapNis,
    setSmokingPref,
    setGenderPref,
    setQuantity,
    setAmount,
    setTaskSubmitting,
  });

  const categoryChips = useMemo(
    () => (isAdmin ? [...POST_CATEGORIES, TASK_CATEGORY_SLUG] : [...POST_CATEGORIES]),
    [isAdmin],
  );

  const contentIsTask = isAdmin && category === TASK_CATEGORY_SLUG;
  const showAmountField = contentIsTask === false && category === 'money';
  const showQuantityField = contentIsTask === false && category === 'items';
  const showTrumpRideFields = contentIsTask === false && category === 'trump';

  const departureValid =
    rideDeparture instanceof Date && !Number.isNaN(rideDeparture.getTime());

  const canPublishPost = showTrumpRideFields
    ? rideFrom.trim().length > 0 && rideTo.trim().length > 0 && departureValid
    : title.trim().length > 0;

  const submitDedicatedPost = useDedicatedPostComposerSubmit({
    t: t as (k: string, o?: Record<string, string>) => string,
    closeComposer,
    userId: selectedUser?.id,
    showTrumpRideFields,
    rideFrom,
    rideTo,
    departureValid,
    rideDeparture,
    intent,
    title,
    isRecurring,
    recurrenceUnit,
    fuelMode,
    fuelCapNis,
    recurrenceFrequency,
    seats,
    smokingPref,
    genderPref,
    description,
    category,
    city,
    showQuantityField,
    showAmountField,
    quantity,
    amount,
  });

  const onPressPublish = () => {
    if (contentIsTask) {
      void taskFormRef.current?.submit();
      return;
    }
    void submitDedicatedPost();
  };

  const titleText = useMemo(() => {
    if (contentIsTask) {
      return t('admin:tasks.newTask');
    }
    return intent === 'request' ? t('common:postComposer.requestTitle') : t('common:postComposer.giveTitle');
  }, [contentIsTask, intent, t]);

  const publishDisabled = contentIsTask ? taskSubmitting : !canPublishPost;
  const publishLabel = contentIsTask ? t('admin:tasks.create') : t('common:postComposer.publish');

  const chip = (active: boolean) => [styles.chip, active && styles.chipActive];

  const recurrenceUnitLabelFn = useMemo(
    () => (u: RecurrenceUnit) => {
      if (u === 'day') return t('trump:ui.recurrenceDay');
      if (u === 'week') return t('trump:ui.recurrenceWeek');
      return t('trump:ui.recurrenceMonth');
    },
    [t],
  );

  const submitRequestHighlight = contentIsTask === false && intent === 'request';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeComposer}>
      <ComposerModalChrome
        styles={styles}
        closeComposer={closeComposer}
        contentIsTask={contentIsTask}
        titleText={titleText}
        categoryChips={categoryChips}
        category={category}
        setCategory={setCategory}
        t={t}
        intent={intent}
        setIntent={setIntent}
        taskFormRef={taskFormRef}
        visible={visible}
        selectedUserId={selectedUser?.id}
        setTaskSubmitting={setTaskSubmitting}
        showTrumpRideFields={showTrumpRideFields}
        showQuantityField={showQuantityField}
        showAmountField={showAmountField}
        title={title}
        description={description}
        city={city}
        quantity={quantity}
        amount={amount}
        setTitle={setTitle}
        setDescription={setDescription}
        setCity={setCity}
        setQuantity={setQuantity}
        setAmount={setAmount}
        rideFrom={rideFrom}
        rideTo={rideTo}
        rideDeparture={rideDeparture}
        setRideFrom={setRideFrom}
        setRideTo={setRideTo}
        setRideDeparture={setRideDeparture}
        advancedOpen={advancedOpen}
        setAdvancedOpen={setAdvancedOpen}
        chip={chip}
        recurrenceUnitLabel={recurrenceUnitLabelFn}
        isRecurring={isRecurring}
        setIsRecurring={setIsRecurring}
        setRecurrenceUnit={setRecurrenceUnit}
        setRecurrenceFrequency={setRecurrenceFrequency}
        recurrenceFrequency={recurrenceFrequency}
        recurrenceUnit={recurrenceUnit}
        seats={seats}
        setSeats={setSeats}
        fuelMode={fuelMode}
        setFuelMode={setFuelMode}
        fuelCapNis={fuelCapNis}
        setFuelCapNis={setFuelCapNis}
        smokingPref={smokingPref}
        setSmokingPref={setSmokingPref}
        genderPref={genderPref}
        setGenderPref={setGenderPref}
        submitRequestHighlight={submitRequestHighlight}
        publishDisabled={publishDisabled}
        publishLabel={publishLabel}
        publishButtonShowsSpinner={contentIsTask && taskSubmitting}
        onPressPublish={onPressPublish}
      />
    </Modal>
  );
}
