import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, PanResponder, Platform } from 'react-native';
import colors from '../globals/colors';

interface VerticalGridSliderProps {
    numColumns: number;
    onNumColumnsChange: (cols: number) => void;
    style?: any;
}

export default function VerticalGridSlider({
    numColumns,
    onNumColumnsChange,
    style
}: VerticalGridSliderProps) {
    const sliderHeight = 160;
    const stepCount = 5;
    const stepHeight = sliderHeight / (stepCount - 1); // Height of one interval (40px)

    // Calculate thumb position based on current columns (0-4 index)
    // 0 -> 0%, 4 -> 100%
    const thumbPosition = ((numColumns - 1) / 4) * sliderHeight;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                // When touch starts, we could snap to the touch position immediately
                const locationY = evt.nativeEvent.locationY;
                // Adjust for padding (the interaction container starts at top: 10)
                // Actually, if we put responder on the wrapper, we need to account for it.
                // Let's simplify: Put responder on a wrapper view that exactly matches the track + padding.
                handleTouch(locationY - 10);
            },
            onPanResponderMove: (evt, gestureState) => {
                // We use locationY from native event which is relative to the view
                // This updates as we drag
                const locationY = evt.nativeEvent.locationY;
                handleTouch(locationY - 10);
            },
            onPanResponderRelease: (evt, gestureState) => {
                // Already handled in Move
            }
        })
    ).current;

    const handleTouch = (y: number) => {
        // y is relative to the top of the track (0 to 160)

        // Clamp y to valid range first
        let clampedY = y;
        if (clampedY < 0) clampedY = 0;
        if (clampedY > sliderHeight) clampedY = sliderHeight;

        // Calculate which step we're closest to
        // We have 5 steps (0, 1, 2, 3, 4) at positions (0, 40, 80, 120, 160)
        const stepSize = sliderHeight / 4; // 40px per step
        const rawStep = clampedY / stepSize;
        const index = Math.round(rawStep);

        const newCols = index + 1;

        // Only update if changed
        if (newCols !== numColumns) {
            onNumColumnsChange(newCols);
        }
    };

    return (
        <View
            style={[styles.columnSliderContainer, style]}
            collapsable={false}
            pointerEvents="box-none"
        >
            {/* Combined Touch & Visual Area with PanResponder */}
            <View
                style={styles.touchArea}
                pointerEvents="auto"
                {...panResponder.panHandlers}
            >
                {/* Visuals Layer */}
                <View style={styles.visualsContainer} pointerEvents="none">
                    {/* Continuous Track Line */}
                    <View style={styles.columnSliderTrack} />

                    {/* Single Indicator Thumb */}
                    <View
                        style={[
                            styles.columnSliderThumb,
                            {
                                top: thumbPosition - 8, // Center thumb
                            }
                        ]}
                    />
                </View>

                {/* Helper overlay to visualise steps for debugging if needed, currently invisible */}
                {/* 
                <View style={{...styles.visualsContainer, opacity: 0}} pointerEvents="none">
                     {[0,1,2,3,4].map(i => (
                         <View key={i} style={{position:'absolute', top: (i/4)*160 - 2, height:4, width: 10, backgroundColor:'red'}} />
                     ))}
                </View>
                */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    columnSliderContainer: {
        position: 'absolute',
        left: 12,
        top: 200,
        zIndex: 999,
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 180,
        ...(Platform.OS === 'android' ? {
            elevation: 999,
        } : {}),
    },
    touchArea: {
        width: 40,
        height: 180, // Full height container
        alignItems: 'center',
        paddingTop: 10, // Match visual offset
    },
    visualsContainer: {
        width: '100%',
        height: 160, // Track height
        alignItems: 'center',
    },
    columnSliderTrack: {
        width: 2,
        height: 160,
        backgroundColor: colors.textSecondary,
        opacity: 0.3,
        borderRadius: 1,
        position: 'absolute',
        left: 19, // Center in 40px width (40-2)/2 = 19
    },
    columnSliderThumb: {
        position: 'absolute',
        left: 12, // Center in 40px width (40-16)/2 = 12
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
});
