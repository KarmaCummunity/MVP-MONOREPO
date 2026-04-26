import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import { db } from '../../utils/databaseService';

type Args = {
  mode: boolean;
  selectedUser: { id?: string; name?: string } | null | undefined;
  loadRides: () => Promise<void>;
  setSearchQuery: (q: string) => void;
};

export function useTrumpOfferRideFlow({
  mode,
  selectedUser,
  loadRides,
  setSearchQuery,
}: Args) {
  const { t } = useTranslation(['donations', 'common', 'trump', 'search']);
  const [isMounted, setIsMounted] = useState(false);
  const [toLocation, setToLocation] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [detectedAddress, setDetectedAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationError, setIsLocationError] = useState(false);
  const [immediateDeparture, setImmediateDeparture] = useState(true);
  const [departureTime, setDepartureTime] = useState('');
  const [leavingToday, setLeavingToday] = useState(true);
  const [rideDate, setRideDate] = useState<Date>(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'day' | 'week' | 'month' | null>(null);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('0');
  const [selectedFormTags, setSelectedFormTags] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    let isMountedLocal = true;

    const getLocation = async () => {
      if (!useCurrentLocation) {
        setDetectedAddress('');
        setIsLocationError(false);
        return;
      }

      setIsLocating(true);
      setIsLocationError(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMountedLocal) {
            setDetectedAddress(t('trump:errors.locationPermissionDenied') || 'Permission denied');
            setIsLocationError(true);
            setIsLocating(false);
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (isMountedLocal && reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          const streetPart = [addr.street, addr.streetNumber].filter(Boolean).join(' ');
          const firstPart = streetPart || addr.name || '';
          const cityPart = addr.city || addr.subregion || addr.district || addr.region || '';
          let formattedAddress = [firstPart, cityPart].filter(Boolean).join(', ');
          if (!formattedAddress.trim()) {
            formattedAddress = `${t('trump:near')} ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
          }
          setDetectedAddress(formattedAddress);
          setIsLocationError(false);
        } else if (isMountedLocal) {
          setDetectedAddress(t('trump:errors.locationFetchFailed') || 'Address not found');
          setIsLocationError(true);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        if (isMountedLocal) {
          setDetectedAddress(t('trump:errors.locationFetchFailed') || 'Location unavailable');
          setIsLocationError(true);
        }
      } finally {
        if (isMountedLocal) setIsLocating(false);
      }
    };

    if (useCurrentLocation) {
      void getLocation();
    }

    return () => {
      isMountedLocal = false;
    };
  }, [useCurrentLocation, t, isMounted]);

  const handleDateChange = useCallback((date: Date) => {
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      setRideDate(date);
    } else {
      setRideDate(new Date());
    }
  }, []);

  const isFormValid = useCallback((): boolean => {
    const hasDest = Boolean(toLocation && toLocation.trim().length > 0);
    const hasOrigin = useCurrentLocation
      ? Boolean(detectedAddress && detectedAddress.length > 0 && !isLocationError)
      : Boolean(fromLocation && fromLocation.trim().length > 0);
    const hasTime = immediateDeparture || Boolean(departureTime && departureTime.trim().length > 0);
    const hasRecurrenceUnit = !isRecurring || Boolean(recurrenceUnit);
    return Boolean(hasDest && hasOrigin && hasTime && hasRecurrenceUnit);
  }, [
    toLocation,
    useCurrentLocation,
    detectedAddress,
    isLocationError,
    fromLocation,
    immediateDeparture,
    departureTime,
    isRecurring,
    recurrenceUnit,
  ]);

  const handleCreateRide = useCallback(async () => {
    if (!isFormValid()) {
      const errors: string[] = [];
      if (!toLocation || !toLocation.trim()) errors.push('יש להזין יעד');
      if (useCurrentLocation) {
        if (!detectedAddress || isLocationError) {
          errors.push('אנא המתן לזיהוי המיקום או הזן כתובת ידנית');
        }
      } else if (!fromLocation || !fromLocation.trim()) {
        errors.push('יש להזין כתובת יציאה');
      }
      if (!immediateDeparture && (!departureTime || !departureTime.trim())) {
        errors.push('יש להזין שעת יציאה');
      }
      if (isRecurring && !recurrenceUnit) {
        errors.push('יש לבחור תדירות לנסיעה חוזרת');
      }
      Alert.alert(
        t('common:errorTitle') || 'שגיאה',
        errors.length > 0 ? errors.join('\n') : (t('trump:errors.formInvalid') || 'יש למלא את כל השדות הנדרשים')
      );
      return;
    }

    setIsPublishing(true);
    try {
      const uid = selectedUser?.id || 'guest';
      const rideId = `${Date.now()}`;

      let dateToSave: string;
      if (immediateDeparture || leavingToday) {
        dateToSave = new Date().toISOString().split('T')[0];
      } else {
        const validDate =
          rideDate && rideDate instanceof Date && !isNaN(rideDate.getTime()) ? rideDate : new Date();
        dateToSave = validDate.toISOString().split('T')[0];
      }

      let timeToSave: string;
      if (immediateDeparture) {
        const now = new Date();
        timeToSave = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      } else {
        timeToSave = departureTime;
      }

      const baseRideData = {
        driverId: uid,
        driverName: selectedUser?.name || 'Me',
        from: useCurrentLocation ? (detectedAddress || (t('trump:currentLocation') as string)) : fromLocation,
        to: toLocation,
        date: dateToSave,
        time: timeToSave,
        seats,
        price: Number(price) || 0,
        noSmoking:
          selectedFormTags.includes('noSmoking') ||
          selectedFormTags.includes(t('trump:filters.noSmoking') as string),
        petsAllowed:
          selectedFormTags.includes('withPets') ||
          selectedFormTags.includes(t('trump:filters.withPets') as string),
        kidsFriendly:
          selectedFormTags.includes('withKids') ||
          selectedFormTags.includes(t('trump:filters.withKids') as string),
        isRecurring,
        recurrenceFrequency,
        recurrenceUnit,
        status: 'active',
      };

      const [hours, minutes] = timeToSave.split(':').map(Number);
      const baseDate = new Date(`${dateToSave}T00:00:00`);
      baseDate.setHours(hours, minutes, 0, 0);

      await db.createRide(uid, rideId, baseRideData);

      if (isRecurring && recurrenceUnit) {
        const instancesToCreate = 5;
        for (let i = 1; i <= instancesToCreate; i++) {
          const nextDate = new Date(baseDate);
          switch (recurrenceUnit) {
            case 'day':
              nextDate.setDate(nextDate.getDate() + recurrenceFrequency * i);
              break;
            case 'week':
              nextDate.setDate(nextDate.getDate() + recurrenceFrequency * 7 * i);
              break;
            case 'month':
              nextDate.setMonth(nextDate.getMonth() + recurrenceFrequency * i);
              break;
          }
          const nextDateStr = nextDate.toISOString().split('T')[0];
          const nextTimeStr = `${String(nextDate.getHours()).padStart(2, '0')}:${String(nextDate.getMinutes()).padStart(2, '0')}`;
          const recurringRideData = { ...baseRideData, date: nextDateStr, time: nextTimeStr };
          const recurringRideId = `${Date.now()}_${i}`;
          await db.createRide(uid, recurringRideId, recurringRideData);
        }
      }

      setToLocation('');
      setFromLocation('');
      setDepartureTime('');
      setImmediateDeparture(true);
      setLeavingToday(true);
      setRideDate(new Date());
      setIsRecurring(false);
      setRecurrenceFrequency(1);
      setRecurrenceUnit(null);
      setUseCurrentLocation(true);
      setSeats(3);
      setPrice('0');
      setSelectedFormTags([]);
      if (!mode) setSearchQuery('');

      try {
        await loadRides();
      } catch (reloadErr) {
        console.warn('TrumpScreen: reload after create failed', reloadErr);
      }

      Alert.alert(t('trump:success.title') as string, t('trump:success.ridePublished') as string);
    } catch (e) {
      console.error('Failed to create ride', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      Alert.alert(
        t('common:errorTitle') as string,
        `${t('trump:errors.saveFailed') as string}\n${errorMessage}`
      );
    } finally {
      setIsPublishing(false);
    }
  }, [
    isFormValid,
    t,
    selectedUser,
    useCurrentLocation,
    detectedAddress,
    isLocationError,
    fromLocation,
    toLocation,
    immediateDeparture,
    departureTime,
    isRecurring,
    recurrenceUnit,
    recurrenceFrequency,
    leavingToday,
    rideDate,
    seats,
    price,
    selectedFormTags,
    mode,
    setSearchQuery,
    loadRides,
  ]);

  return {
    toLocation,
    setToLocation,
    fromLocation,
    setFromLocation,
    useCurrentLocation,
    setUseCurrentLocation,
    detectedAddress,
    isLocating,
    isLocationError,
    departureTime,
    setDepartureTime,
    immediateDeparture,
    setImmediateDeparture,
    leavingToday,
    setLeavingToday,
    rideDate,
    handleDateChange,
    isRecurring,
    setIsRecurring,
    recurrenceFrequency,
    setRecurrenceFrequency,
    recurrenceUnit,
    setRecurrenceUnit,
    seats,
    setSeats,
    price,
    setPrice,
    selectedFormTags,
    setSelectedFormTags,
    handleCreateRide,
    isFormValid,
    isPublishing,
  };
}
