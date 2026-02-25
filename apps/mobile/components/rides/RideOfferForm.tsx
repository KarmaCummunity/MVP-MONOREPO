import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, I18nManager, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';
import TimePicker from '../TimePicker';
import DatePicker from '../DatePicker';
import { useTranslation } from 'react-i18next';

// Ensure layout is RTL friendly manually where needed
const isRTL = I18nManager.isRTL;

interface RideOfferFormProps {
    // Destination
    destination: string;
    onDestinationChange: (val: string) => void;

    // Origin
    fromLocation: string;
    onFromLocationChange: (val: string) => void;
    useCurrentLocation: boolean;
    onToggleCurrentLocation: (val: boolean) => void;

    // Time & Date Logic
    departureTime: string;
    onDepartureTimeChange: (val: string) => void;
    immediateDeparture: boolean;
    onToggleImmediateDeparture: (val: boolean) => void;

    leavingToday: boolean;
    onToggleLeavingToday: (val: boolean) => void;

    rideDate: Date;
    onDateChange: (date: Date) => void;

    // Recurring
    isRecurring: boolean;
    onToggleRecurring: (val: boolean) => void;
    recurrenceFrequency: number;
    onRecurrenceFrequencyChange: (val: number) => void;
    recurrenceUnit: 'day' | 'week' | 'month' | null;
    onRecurrenceUnitChange: (val: 'day' | 'week' | 'month' | null) => void;

    // Seats & Price
    seats: number;
    onSeatsChange: (val: number) => void;
    price: string;
    onPriceChange: (val: string) => void;

    // Filters/Tags
    selectedTags: string[];
    onToggleTag: (tag: string) => void;
    availableTags: string[];

    // Submit
    onSubmit: () => void;
    isValid: boolean;
    hideDestinationInput?: boolean;

    // Location Details
    detectedAddress?: string;
    isLocating?: boolean;
    isLocationError?: boolean;
}

const RideOfferForm: React.FC<RideOfferFormProps> = ({
    destination, onDestinationChange,
    fromLocation, onFromLocationChange,
    useCurrentLocation, onToggleCurrentLocation,
    detectedAddress, isLocating, isLocationError, // Destructure new props
    departureTime, onDepartureTimeChange,
    immediateDeparture, onToggleImmediateDeparture,
    leavingToday, onToggleLeavingToday,
    rideDate, onDateChange,
    isRecurring, onToggleRecurring,
    recurrenceFrequency, onRecurrenceFrequencyChange,
    recurrenceUnit, onRecurrenceUnitChange,
    seats, onSeatsChange,
    price, onPriceChange,
    selectedTags, onToggleTag, availableTags,
    onSubmit, isValid, hideDestinationInput
}) => {
    const { t } = useTranslation();
    const priceInputRef = useRef<TextInput>(null);
    const [needToPay, setNeedToPay] = useState(price !== '0' && price !== '');

    // Synchronize internal pay toggle if price changes externally
    React.useEffect(() => {
        if (price && price !== '0') setNeedToPay(true);
    }, [price]);

    // Ensure rideDate is always a valid Date
    const validRideDate = React.useMemo(() => {
        if (!rideDate || !(rideDate instanceof Date) || isNaN(rideDate.getTime())) {
            return new Date();
        }
        return rideDate;
    }, [rideDate]);

    const handleDateChange = (date: Date | null) => {
        if (date && date instanceof Date && !isNaN(date.getTime())) {
            onDateChange(date);
        } else {
            onDateChange(new Date());
        }
    };

    return (
        <View style={styles.formContainer}>

            {/* 1. Destination */}
            {!hideDestinationInput && (
                <View style={styles.section}>
                    <Text style={styles.label}>
                        {t('trump:ui.searchPlaceholder.offer')} <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={destination}
                        onChangeText={onDestinationChange}
                        placeholder={t('trump:ui.searchPlaceholder.offer')}
                        textAlign={isRTL ? 'right' : 'left'}
                    />
                </View>
            )}

            {/* 2. From Location */}
            <View style={styles.section}>
                <Text style={styles.label}>
                    {t('trump:ui.fromLocationLabel')} <Text style={styles.requiredStar}>*</Text>
                </Text>

                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => onToggleCurrentLocation(!useCurrentLocation)}
                >
                    <View style={[styles.checkbox, useCurrentLocation && styles.checkboxChecked]}>
                        {useCurrentLocation && <Icon name="checkmark" size={16} color="white" />}
                    </View>
                    <Text style={[
                        styles.checkboxLabel,
                        { flex: 1, flexWrap: 'wrap' },
                        (isLocationError && useCurrentLocation) ? { color: colors.error } : {}
                    ]}>
                        {isLocating
                            ? `${t('trump:currentLocation')}...`
                            : (useCurrentLocation && detectedAddress ? detectedAddress : t('trump:currentLocation'))
                        }
                    </Text>
                </TouchableOpacity>

                {!useCurrentLocation && (
                    <TextInput
                        style={[styles.input, { marginTop: 8 }]}
                        value={fromLocation}
                        onChangeText={onFromLocationChange}
                        placeholder={t('trump:ui.enterDepartureAddress')}
                        textAlign={isRTL ? 'right' : 'left'}
                    />
                )}
            </View>

            {/* 3. Time & Date Logic */}
            <View style={styles.section}>
                <Text style={styles.label}>
                    {t('trump:ui.timePickerPlaceholder')} <Text style={styles.requiredStar}>*</Text>
                </Text>

                {/* Immediate Departure Checkbox */}
                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => onToggleImmediateDeparture(!immediateDeparture)}
                >
                    <View style={[styles.checkbox, immediateDeparture && styles.checkboxChecked]}>
                        {immediateDeparture && <Icon name="checkmark" size={16} color="white" />}
                    </View>
                    <Text style={styles.checkboxLabel}>{t('trump:ui.immediateDeparture')}</Text>
                </TouchableOpacity>

                {!immediateDeparture && (
                    <View style={styles.dateTimeContainer}>
                        {/* Time Picker */}
                        <TimePicker
                            value={departureTime}
                            onTimeChange={onDepartureTimeChange}
                            placeholder={t('trump:ui.timePickerPlaceholder')}
                        />

                        {/* Leaving Today Checkbox */}
                        <TouchableOpacity
                            style={[styles.checkboxRow, { marginTop: 12 }]}
                            onPress={() => onToggleLeavingToday(!leavingToday)}
                        >
                            <View style={[styles.checkbox, leavingToday && styles.checkboxChecked]}>
                                {leavingToday && <Icon name="checkmark" size={16} color="white" />}
                            </View>
                            <Text style={styles.checkboxLabel}>{t('trump:ui.leavingToday')}</Text>
                        </TouchableOpacity>

                        {/* Date Picker (if not today) */}
                        {!leavingToday && (
                            <View style={{ marginTop: 12 }}>
                                <DatePicker
                                    value={validRideDate}
                                    onChange={handleDateChange}
                                    placeholder={t('trump:ui.selectDate')}
                                    minimumDate={new Date()}
                                />
                            </View>
                        )}
                    </View>
                )}

                {/* Recurring Ride Checkbox */}
                <TouchableOpacity
                    style={[styles.checkboxRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}
                    onPress={() => {
                        const newValue = !isRecurring;
                        onToggleRecurring(newValue);
                        if (!newValue) {
                            onRecurrenceUnitChange(null);
                            onRecurrenceFrequencyChange(1);
                        }
                    }}
                >
                    <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
                        {isRecurring && <Icon name="checkmark" size={16} color="white" />}
                    </View>
                    <Text style={styles.checkboxLabel}>{t('trump:ui.recurringRide')}</Text>
                </TouchableOpacity>

                {/* Recurrence Configuration (shown when recurring is enabled) */}
                {isRecurring && (
                    <View style={[styles.dateTimeContainer, { marginTop: 12 }]}>
                        <Text style={[styles.label, { fontSize: FontSizes.small, marginBottom: 12 }]}>
                            {t('trump:ui.recurrenceConfigLabel')}
                        </Text>

                        {/* Frequency Counter */}
                        <View style={styles.recurrenceRow}>
                            <View style={styles.recurrenceFrequencyContainer}>
                                <Text style={[styles.label, { fontSize: FontSizes.small, marginBottom: 8 }]}>
                                    {t('trump:ui.recurrenceFrequencyLabel')}
                                </Text>
                                <View style={styles.counterRow}>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => onRecurrenceFrequencyChange(Math.max(1, recurrenceFrequency - 1))}
                                    >
                                        <Text style={styles.counterText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.counterValue}>{recurrenceFrequency}</Text>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => onRecurrenceFrequencyChange(Math.min(12, recurrenceFrequency + 1))}
                                    >
                                        <Text style={styles.counterText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Unit Selection */}
                            <View style={styles.recurrenceUnitContainer}>
                                <Text style={[styles.label, { fontSize: FontSizes.small, marginBottom: 8 }]}>
                                    {t('trump:ui.recurrenceUnitLabel')}
                                </Text>
                                <View style={styles.recurrenceUnitOptions}>
                                    <TouchableOpacity
                                        style={[styles.recurrenceUnitOption, recurrenceUnit === 'day' && styles.recurrenceUnitOptionSelected]}
                                        onPress={() => onRecurrenceUnitChange('day')}
                                    >
                                        <Text style={[styles.recurrenceUnitOptionText, recurrenceUnit === 'day' && styles.recurrenceUnitOptionTextSelected]}>
                                            {t('trump:ui.recurrenceDay')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.recurrenceUnitOption, recurrenceUnit === 'week' && styles.recurrenceUnitOptionSelected]}
                                        onPress={() => onRecurrenceUnitChange('week')}
                                    >
                                        <Text style={[styles.recurrenceUnitOptionText, recurrenceUnit === 'week' && styles.recurrenceUnitOptionTextSelected]}>
                                            {t('trump:ui.recurrenceWeek')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.recurrenceUnitOption, recurrenceUnit === 'month' && styles.recurrenceUnitOptionSelected]}
                                        onPress={() => onRecurrenceUnitChange('month')}
                                    >
                                        <Text style={[styles.recurrenceUnitOptionText, recurrenceUnit === 'month' && styles.recurrenceUnitOptionTextSelected]}>
                                            {t('trump:ui.recurrenceMonth')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Preview text */}
                        {recurrenceUnit && (
                            <Text style={[styles.recurrencePreview, { marginTop: 12, textAlign: 'right' }]}>
                                {(() => {
                                    const unitText = recurrenceUnit === 'day'
                                        ? (recurrenceFrequency === 1 ? t('trump:ui.recurrenceDay') : t('trump:ui.recurrenceDays'))
                                        : recurrenceUnit === 'week'
                                            ? (recurrenceFrequency === 1 ? t('trump:ui.recurrenceWeek') : t('trump:ui.recurrenceWeeks'))
                                            : (recurrenceFrequency === 1 ? t('trump:ui.recurrenceMonth') : t('trump:ui.recurrenceMonths'));
                                    return t('trump:ui.recurrencePreview', { frequency: recurrenceFrequency, unit: unitText });
                                })()}
                            </Text>
                        )}
                    </View>
                )}

            </View>

            {/* 4. Seats & Price */}
            <View style={styles.row}>
                <View style={styles.fieldSmall}>
                    <Text style={styles.label}>{t('trump:ui.seatsLabel')}</Text>
                    <View style={styles.counterRow}>
                        <TouchableOpacity style={styles.counterBtn} onPress={() => onSeatsChange(Math.max(1, seats - 1))}>
                            <Text style={styles.counterText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{seats}</Text>
                        <TouchableOpacity style={styles.counterBtn} onPress={() => onSeatsChange(Math.min(8, seats + 1))}>
                            <Text style={styles.counterText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.fieldSmall}>
                    <TouchableOpacity onPress={() => {
                        const newVal = !needToPay;
                        setNeedToPay(newVal);
                        if (!newVal) onPriceChange('0');
                    }} activeOpacity={0.8}>
                        <Text style={[styles.label, { color: needToPay ? colors.textPrimary : colors.textSecondary }]}>
                            {t('trump:ui.fuelContributionLabel')}
                        </Text>
                    </TouchableOpacity>

                    {needToPay && (
                        <View style={styles.inputWrapper}>
                            <TextInput
                                ref={priceInputRef}
                                style={[styles.input, { textAlign: 'center', paddingRight: 20 }]}
                                value={price}
                                onChangeText={(t) => onPriceChange(t.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                                placeholder="0"
                            />
                            <Text style={styles.currencySymbol}>₪</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[styles.offerButton, !isValid && { opacity: 0.5 }]}
                onPress={onSubmit}
                disabled={!isValid}
            >
                <Text style={styles.offerButtonText}>{t('trump:ui.publishRide')}</Text>
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        padding: 4,
        width: '100%',
    },
    section: {
        marginBottom: 16,
        width: '100%',
    },
    dateTimeContainer: {
        marginTop: 12,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: colors.border,
    },
    row: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 16,
    },
    fieldSmall: {
        flex: 1,
    },
    label: {
        fontSize: FontSizes.medium,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
        textAlign: 'right',
    },
    requiredStar: {
        color: colors.error,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: colors.moneyInputBackground,
        borderRadius: 10,
        padding: 12,
        fontSize: FontSizes.body,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        width: '100%',
    },
    locationOptions: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    locationOption: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        alignItems: 'center',
        backgroundColor: colors.moneyFormBackground,
    },
    locationOptionSelected: {
        backgroundColor: colors.moneyButtonBackground,
        borderColor: colors.moneyButtonBackground,
    },
    locationOptionText: {
        fontSize: FontSizes.small,
        color: colors.textPrimary,
    },
    locationOptionTextSelected: {
        color: colors.backgroundPrimary,
        fontWeight: 'bold',
    },
    checkboxRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.moneyButtonBackground,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundPrimary,
    },
    checkboxChecked: {
        backgroundColor: colors.moneyButtonBackground,
    },
    checkboxLabel: {
        fontSize: FontSizes.body,
        color: colors.textPrimary,
    },
    dateButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.moneyInputBackground,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
    },
    dateButtonText: {
        fontSize: FontSizes.body,
        color: colors.textPrimary,
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.moneyInputBackground,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        paddingHorizontal: 8,
        paddingVertical: 6,
        height: 48,
    },
    counterBtn: {
        backgroundColor: colors.moneyFormBackground,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    counterText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    counterValue: {
        fontSize: FontSizes.medium,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    currencySymbol: {
        position: 'absolute',
        left: 12,
        fontSize: FontSizes.body,
        color: colors.textSecondary,
    },
    tagsRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: colors.moneyFormBackground,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    tagSelected: {
        backgroundColor: colors.moneyStatusBackground,
        borderColor: colors.moneyStatusBackground,
    },
    tagText: {
        fontSize: FontSizes.small,
        color: colors.textPrimary,
    },
    tagTextSelected: {
        color: colors.moneyStatusText,
        fontWeight: 'bold',
    },
    offerButton: {
        backgroundColor: colors.moneyButtonBackground,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    offerButtonText: {
        color: colors.backgroundPrimary,
        fontSize: FontSizes.medium,
        fontWeight: 'bold',
    },
    recurrenceRow: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 8,
    },
    recurrenceFrequencyContainer: {
        flex: 1,
    },
    recurrenceUnitContainer: {
        flex: 1.5,
    },
    recurrenceUnitOptions: {
        flexDirection: 'row-reverse',
        gap: 6,
    },
    recurrenceUnitOption: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        backgroundColor: colors.moneyFormBackground,
        alignItems: 'center',
    },
    recurrenceUnitOptionSelected: {
        backgroundColor: colors.moneyButtonBackground,
        borderColor: colors.moneyButtonBackground,
    },
    recurrenceUnitOptionText: {
        fontSize: FontSizes.small,
        color: colors.textPrimary,
    },
    recurrenceUnitOptionTextSelected: {
        color: colors.backgroundPrimary,
        fontWeight: 'bold',
    },
    recurrencePreview: {
        fontSize: FontSizes.small,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
});

export default RideOfferForm;
