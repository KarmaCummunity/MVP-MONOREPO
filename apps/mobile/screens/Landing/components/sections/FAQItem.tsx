/**
 * @file FAQItem
 * @description Expandable FAQ item with question and answer
 * @module Landing/Components/Sections
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../../globals/colors';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';

interface FAQItemProps {
  question: string;
  answer: string;
  icon?: string;
}

export const FAQItem: React.FC<FAQItemProps> = ({ question, answer, icon }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(() => new Animated.Value(0));
  const [animatedRotation] = useState(() => new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setIsExpanded(!isExpanded);
  };

  const contentHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const rotateInterpolate = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.faqCard}>
      <TouchableOpacity
        style={styles.faqQuestionRow}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.faqQuestionContent}>
          {icon && (
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={IS_MOBILE_WEB ? 20 : 24}
              color={colors.info}
              style={styles.faqIcon}
            />
          )}
          <Text style={styles.faqQ}>{question}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons
            name="chevron-down-outline"
            size={IS_MOBILE_WEB ? 20 : 24}
            color={colors.info}
          />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[styles.faqAnswerContainer, { maxHeight: contentHeight, opacity: animatedHeight }]}>
        <Text style={styles.faqA}>{answer}</Text>
      </Animated.View>
    </View>
  );
};
