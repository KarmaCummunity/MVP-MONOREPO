// AutocompleteInputOnly.tsx
import React, { useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import colors from "../globals/colors";
import { FontSizes } from "../globals/constants";

interface AutocompleteInputOnlyProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder?: string;
  // Change the type of inputRef in the signature here
  onLayoutMeasure: (x: number, y: number, width: number, height: number, inputRef: React.RefObject<TextInput | null>) => void;
}

const AutocompleteInputOnly: React.FC<AutocompleteInputOnlyProps> = ({
  label,
  value,
  onChangeText,
  onFocus,
  onBlur,
  placeholder,
  onLayoutMeasure,
}) => {
  const inputRef = useRef<TextInput>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    // We're measuring the current element, so inputRef.current won't be null here
    inputRef.current?.measureInWindow((x, y, width, height) => {
      onLayoutMeasure(x, y, width, height, inputRef); // Pass the ref as is
    });
  };

  return (
    <View style={localStyles.container}>
      <Text style={localStyles.label}>{label}</Text>
      <View style={localStyles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={localStyles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onLayout={handleLayout}
          placeholder={placeholder}
          placeholderTextColor={colors.dropdownPlaceholder}
        />
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    fontSize: FontSizes.medium,
    marginBottom: 5,
    color: colors.dropdownLabel,
    textAlign: 'right',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.dropdownBorder,
    borderRadius: 8,
    backgroundColor: colors.dropdownBackground,
  },
  input: {
    height: 40,
    paddingHorizontal: 10,
    fontSize: FontSizes.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default AutocompleteInputOnly;