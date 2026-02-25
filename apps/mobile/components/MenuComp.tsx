import React, { useRef, useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../globals/colors";
import { FontSizes } from "../globals/constants";
import { getResponsiveMenuStyles, responsiveFontSize, responsiveSpacing, scaleSize } from "../globals/responsive";
import { createShadowStyle } from "../globals/styles";

// Define the props that the MenuComp component will accept
interface MenuCompProps {
  options: string[]; // Array of strings for the menu items
  onSelectOption: (option: string) => void; // Function to call when an option is selected
}

const MenuComp: React.FC<MenuCompProps> = ({ options, onSelectOption }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // Animated values for scale and opacity
  const scaleAnim = useRef(new Animated.Value(0.01)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Get responsive menu styles
  const menuStyles = getResponsiveMenuStyles();

  const openMenu = () => {
    setIsVisible(true);
  };

  const closeMenu = () => setIsVisible(false);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.01,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isVisible, scaleAnim, opacityAnim]);

  return (
    <>
      {/* The menu icon that opens the dropdown */}
      <TouchableOpacity
        onPress={openMenu}
        style={localStyles.menuIconPlacement}
      >
        <Ionicons name="menu" size={scaleSize(22)} color={colors.menuText} />
      </TouchableOpacity>

      {/* Modal is only rendered when isVisible is true */}
      {isVisible && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={isVisible}
          onRequestClose={closeMenu}
        >
          <TouchableOpacity
            style={localStyles.modalOverlay}
            activeOpacity={1}
            onPressOut={closeMenu}
          >
            <Animated.View
              style={[
                localStyles.modalContent,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                  // Position the modal content relative to the top-right of the screen - responsive
                  top: menuStyles.top,
                  right: menuStyles.right,
                  minWidth: menuStyles.minWidth,
                  maxWidth: menuStyles.maxWidth,
                  maxHeight: menuStyles.maxHeight,
                  paddingVertical: menuStyles.paddingVertical,
                  paddingHorizontal: menuStyles.paddingHorizontal,
                  borderRadius: menuStyles.borderRadius,
                },
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      localStyles.menuOption,
                      index === options.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => {
                      onSelectOption(option);
                      closeMenu(); // Close the menu after selection
                    }}
                  >
                    <Text style={localStyles.menuOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const localStyles = StyleSheet.create({
  menuIconPlacement: {
    padding: responsiveSpacing(5, 6, 8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  modalContent: {
    backgroundColor: colors.menuBackground,
    position: "absolute",
    // Dynamic styles applied in JSX for responsive sizing
    ...createShadowStyle(colors.black, { width: 0, height: scaleSize(2) }, 0.25, scaleSize(3.84)),
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.menuBorder,
  },
  menuOption: {
    paddingHorizontal: responsiveSpacing(20, 24, 28),
    paddingVertical: responsiveSpacing(12, 14, 16),
    borderBottomWidth: 1,
    borderBottomColor: colors.menuBorder,
    width: "100%",
    alignSelf: "flex-end", // Align text to the right for rtl layout
  },
  menuOptionText: {
    fontSize: responsiveFontSize(FontSizes.body, 16, 18),
    textAlign: "right", // Text alignment for rtl
    writingDirection: "rtl", // Explicit rtl text direction
    color: colors.menuText,
  },
});

export default MenuComp;