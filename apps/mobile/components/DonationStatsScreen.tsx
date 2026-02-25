// File overview:
// - Purpose: Visualize community donation stats as animated bubbles with motivational quotes.
// - Reached from: Home or Donations related routes embedding this component.
// - Inputs: None directly; pulls localized strings via i18n and sample data from `globals/fakeData`.
// - Behavior: Generates background and stat bubbles, animates float/pulse, toggles selection to highlight values.
"use strict";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  GestureResponderEvent,
  StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { FontSizes } from "../globals/constants";
// Initial data - replace with real data from API
const charities: any[] = [{
  id: 'kc',
  name: 'KarmaCommunity',
  statistics: [
    { id: '1', name: 'קהילה', value: 3847, icon: '👥', category: 'community', color: colors.info },
    { id: '2', name: 'תרומות', value: 12456, icon: '❤️', category: 'donations', color: colors.secondary },
  ],
  motivationalQuotes: [
    'נתינה היא הקבלה הגדולה ביותר.',
    'ביחד אנחנו בונים עולם טוב יותר.',
  ]
}];
import { TouchableOpacity } from "react-native";
import colors from "../globals/colors";
import { useTranslation } from "react-i18next";

// Get the dimensions of the device window for responsive sizing
const { width, height } = Dimensions.get("window");

// --- Constants ---
const kcStats = charities[0]?.statistics || [];
const STATS_BUBBLE_COUNT = kcStats.length;
const BACKGROUND_BUBBLES_COUNT = 15;
const MIN_SIZE = 60;
const MAX_SIZE = 160;
const BACKGROUND_MIN_SIZE = 30;
const BACKGROUND_MAX_SIZE = 80;
const MIN_VALUE = kcStats.length > 0 ? Math.min(...kcStats.map((s: any) => s.value)) : 0;
const MAX_VALUE = kcStats.length > 0 ? Math.max(...kcStats.map((s: any) => s.value)) : 100;

/**
 * ממיר מספר לערך גודל בועה בטווח המוגדר
 * @param num - המספר להמרה
 * @returns גודל הבועה בפיקסלים
 */
const scaleNumberToSize = (num: number): number => {
  const clampedNum = Math.max(MIN_VALUE, Math.min(MAX_VALUE, num));
  const scaledSize =
    MIN_SIZE +
    ((clampedNum - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) *
    (MAX_SIZE - MIN_SIZE);
  return scaledSize;
};

/**
 * בודק אם בועה חדשה תחפוף עם בועות קיימות
 */
const isOverlapping = (
  x: number,
  y: number,
  size: number,
  bubbles: any[]
): boolean => {
  const overlapThreshold = 1.8;
  for (const b of bubbles) {
    const dx = b.x - x;
    const dy = b.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < (b.size + size) / overlapThreshold) {
      return true;
    }
  }
  return false;
};

const generateStatsLayout = () => {
  console.log("Generating donation stats bubbles...");
  const bubbles: any[] = [];
  let attempts = 0;
  const maxAttempts = 3000;

  for (let i = 0; i < BACKGROUND_BUBBLES_COUNT && attempts < maxAttempts; i++) {
    const size = BACKGROUND_MIN_SIZE + Math.random() * (BACKGROUND_MAX_SIZE - BACKGROUND_MIN_SIZE);

    let placed = false;
    let localAttempts = 0;
    const maxLocalAttempts = 200;

    while (!placed && localAttempts < maxLocalAttempts) {
      const margin = 40;
      const x = margin + Math.random() * (width - size - margin * 2);
      const y = 200 + Math.random() * (height - size - 350);

      if (!isOverlapping(x, y, size, bubbles)) {
        bubbles.push({
          id: `bg-${i}`,
          size,
          x,
          y,
          value: 0,
          name: "",
          icon: "",
          category: "background",
          color: colors.border,
          directionX: Math.random() > 0.5 ? 1 : -1,
          directionY: Math.random() > 0.5 ? 1 : -1,
          delay: Math.random() * 2000,
          isBackground: true,
        });
        placed = true;
      }
      localAttempts++;
      attempts++;
    }
  }

  for (let i = 0; i < kcStats.length && attempts < maxAttempts; i++) {
    const stat = kcStats[i];
    const size = scaleNumberToSize(stat.value);

    let placed = false;
    let localAttempts = 0;
    const maxLocalAttempts = 300;

    while (!placed && localAttempts < maxLocalAttempts) {
      const margin = 20;
      const x = margin + Math.random() * (width - size - margin * 2);
      const y = 200 + Math.random() * (height - size - 350);

      if (!isOverlapping(x, y, size, bubbles)) {
        bubbles.push({
          id: stat.id,
          size,
          x,
          y,
          value: stat.value,
          name: stat.name,
          icon: stat.icon,
          category: stat.category,
          color: stat.color,
          directionX: Math.random() > 0.5 ? 1 : -1,
          directionY: Math.random() > 0.5 ? 1 : -1,
          delay: Math.random() * 1000,
          isBackground: false,
        });
        placed = true;
      }
      localAttempts++;
      attempts++;
    }
  }

  console.log(`Generated ${bubbles.length} bubbles total`);
  return bubbles;
};

/**
 * קומפוננטה ראשית להצגת סטטיסטיקות תרומות כבועות צפות
 */
const DonationStatsScreen: React.FC = () => {
  const { t } = useTranslation(["donations", "common"]);
  const bubbles = useMemo(generateStatsLayout, []);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  /**
   * מטפל בלחיצה על בועה
   */
  const handleBubblePress = useCallback((id: string) => {
    setSelectedBubbleId((prevId) => {
      const newId = prevId === id ? null : id;
      return newId;
    });
    setCurrentSentenceIndex((prevIndex) => {
      const kcQuotes = charities[0]?.motivationalQuotes || [];
      const newIndex = kcQuotes.length > 0 ? (prevIndex + 1) % kcQuotes.length : 0;
      return newIndex;
    });
  }, []);

  /**
   * מטפל בלחיצה על הודעה מוטיבציונית
   */
  const handleMessagePress = useCallback(() => {
    const kcQuotes = charities[0]?.motivationalQuotes || [];
    setCurrentSentenceIndex(
      (prevIndex) => kcQuotes.length > 0 ? (prevIndex + 1) % kcQuotes.length : 0
    );
  }, []);

  return (
    <View style={localStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Screen header */}
      <View style={localStyles.headerContainer}>
        <Text style={localStyles.title}>{t('donations:statsScreen.title')}</Text>
        <Text style={localStyles.subtitle}>{t('donations:statsScreen.subtitle')}</Text>
      </View>

      {/* Bubbles container */}
      <View style={localStyles.bubblesContainer}>
        {bubbles.map((bubble) => (
          <AnimatedStatsBubble
            key={bubble.id}
            {...bubble}
            isSelected={selectedBubbleId === bubble.id}
            onPress={handleBubblePress}
          />
        ))}
      </View>

      {/* Motivational message container */}
      <View style={localStyles.messageContainer}>
        <TouchableOpacity
          onPress={handleMessagePress}
          style={localStyles.messageButton}
        >
          <Text style={localStyles.messageText}>
            {charities[0]?.motivationalQuotes?.[currentSentenceIndex] || t('donations:statsScreen.noQuotes')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- AnimatedStatsBubble Component ---

interface AnimatedStatsBubbleProps {
  id: string;
  size: number;
  x: number;
  y: number;
  value: number;
  name: string;
  icon: string;
  category: string;
  color: string;
  directionX: number;
  directionY: number;
  delay: number;
  isSelected: boolean;
  onPress: (id: string) => void;
  isBackground?: boolean;
}

/**
 * קומפוננטת בועה בודדת עם אנימציות עדינות
 */
const AnimatedStatsBubble: React.FC<AnimatedStatsBubbleProps> = ({
  id,
  size,
  x,
  y,
  value,
  name,
  icon,
  category,
  color,
  directionX,
  directionY,
  delay,
  isSelected,
  onPress,
  isBackground = false,
}) => {
  const floatOffset = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const animatedOpacity = useSharedValue(0.85);
  const animatedScale = useSharedValue(1);

  useEffect(() => {
    floatOffset.value = withRepeat(
      withDelay(
        delay,
        withTiming(1, {
          duration: 4000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );
  }, [delay, floatOffset]);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withDelay(
        delay + 500,
        withTiming(1.08, {
          duration: 2500 + Math.random() * 1500,
          easing: Easing.inOut(Easing.quad),
        })
      ),
      -1,
      true
    );
  }, [delay, pulseScale]);

  useEffect(() => {
    animatedOpacity.value = withTiming(isSelected ? 1 : 0.85, {
      duration: 300,
    });
    animatedScale.value = withSpring(isSelected ? 1.15 : 1, {
      damping: 12,
      stiffness: 150,
    });
  }, [isSelected, animatedOpacity, animatedScale]);

  const handleInternalPress = useCallback(
    (event: GestureResponderEvent) => {
      if (!isBackground) {
        onPress(id);
      }
    },
    [id, onPress, isBackground]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const floatX = interpolate(
      floatOffset.value,
      [0, 1],
      [0, 6 * directionX]
    );
    const floatY = interpolate(
      floatOffset.value,
      [0, 1],
      [0, 8 * directionY]
    );

    let backgroundColor, borderColor, shadowColor;

    if (isBackground) {
      backgroundColor = color + '15';
      borderColor = color + '30';
      shadowColor = color + '20';
    } else {
      backgroundColor = color + '20';
      borderColor = color;
      shadowColor = color + '40';

      if (isSelected) {
        backgroundColor = color + '40';
        borderColor = color;
        shadowColor = color + '60';
      }
    }

    return {
      transform: [
        { translateX: x + floatX },
        { translateY: y + floatY },
        { scale: animatedScale.value * pulseScale.value },
      ] as any,
      backgroundColor,
      borderColor,
      shadowColor,
      opacity: animatedOpacity.value,
    };
  });

  const iconSize = Math.max(size * 0.15, 16);
  const valueSize = Math.max(size * 0.18, 14);
  const nameSize = Math.max(size * 0.08, 10);

  return (
    <TouchableWithoutFeedback onPress={handleInternalPress}>
      <Animated.View
        style={[
          localStyles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            zIndex: isBackground ? 1 : isSelected ? 100 : 10,
          },
          animatedStyle,
        ]}
      >
        {!isBackground && (
          <View style={localStyles.bubbleContent}>
            {/* Icon */}
            <Text style={[localStyles.bubbleIcon, { fontSize: iconSize }]}>
              {icon}
            </Text>

            {/* Value */}
            <Text
              style={[
                localStyles.bubbleValue,
                {
                  fontSize: valueSize,
                  color: isSelected ? colors.textPrimary : colors.textSecondary,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {value.toLocaleString()}
            </Text>

            {/* Name */}
            <Text
              style={[
                localStyles.bubbleName,
                {
                  fontSize: nameSize,
                  color: isSelected ? colors.textPrimary : colors.textTertiary,
                  lineHeight: nameSize * 1.3,
                },
              ]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >
              {name}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// --- StyleSheet ---
const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: FontSizes.heading1,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  bubblesContainer: {
    flex: 1,
    position: "relative",
    marginTop: 20,
  },
  bubble: {
    position: "absolute",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    elevation: 8,
  },
  bubbleContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: "100%",
  },
  bubbleIcon: {
    textAlign: "center",
    marginBottom: 4,
  },
  bubbleValue: {
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  bubbleName: {
    textAlign: "center",
    fontWeight: "600",
    opacity: 0.9,
  },
  messageContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 1000,
  },
  messageButton: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  messageText: {
    fontSize: FontSizes.small,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default DonationStatsScreen;