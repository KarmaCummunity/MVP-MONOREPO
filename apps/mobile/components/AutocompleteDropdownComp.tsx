// File overview:
// - Purpose: Controlled dropdown with searchable modal list; returns a selected string value.
// - Reached from: Various forms/screens needing a compact autocomplete selector.
// - Inputs: `label`, `selectedValue`, `onValueChange`, `options`, optional `placeholder`.
// - Behavior: Opens modal with search, filters options client-side, calls `onValueChange` on select.
// components/AutocompleteDropdownComp.tsx
import React, { useState } from "react";
import { FontSizes } from '../globals/constants';
import colors from '../globals/colors';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Keyboard,
} from "react-native";
import { MaterialIcons as Icon } from '@expo/vector-icons';

interface AutocompleteDropdownCompProps {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export default function AutocompleteDropdownComp({
  label,
  selectedValue,
  onValueChange,
  options,
  placeholder,
}: AutocompleteDropdownCompProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectOption = (option: string) => {
    onValueChange(option);
    setSearchTerm(option); // Set the search term to the selected value
    setIsModalVisible(false);
    Keyboard.dismiss(); // Dismiss the keyboard when an option is selected
  };

  return (
    <View style={dropdownStyles.container}>
      <Text style={dropdownStyles.label}>{label}</Text>
      <TouchableOpacity
        style={dropdownStyles.inputContainer}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <TextInput
          style={dropdownStyles.textInput}
          value={searchTerm || selectedValue} // Display search term or selected value
          placeholder={placeholder || 'Select'}
          placeholderTextColor={colors.dropdownPlaceholder}
          editable={false} // Make it not directly editable, only through the modal
        />
        <Icon
          name={isModalVisible ? "arrow-drop-up" : "arrow-drop-down"}
          size={24}
          color={colors.dropdownIcon}
        />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
        accessibilityViewIsModal={true}
        statusBarTranslucent={false}
      >
        <TouchableOpacity
          style={dropdownStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsModalVisible(false);
            Keyboard.dismiss();
          }} // Dismiss modal and keyboard on overlay press
        >
          <View 
            style={dropdownStyles.modalContent}
            accessible={true}
            accessibilityRole="dialog"
            accessibilityLabel="Search options"
          >
            <View style={dropdownStyles.searchContainer}>
              <Icon name="search" size={20} color={colors.dropdownSearchIcon} style={{ marginRight: 8 }} />
              <TextInput
                style={dropdownStyles.searchInput}
                placeholder={'Search'}
                placeholderTextColor={colors.dropdownPlaceholder}
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoFocus={true} // Focus input when modal opens
              />
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Icon name="close" size={24} color={colors.dropdownCloseIcon} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={dropdownStyles.optionItem}
                  onPress={() => handleSelectOption(item)}
                >
                  <Text style={dropdownStyles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={dropdownStyles.noOptionsText}>No options</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const dropdownStyles = StyleSheet.create({
  container: {
    // marginBottom: 10,
    zIndex: 1, // Ensure dropdown is above other elements
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: "600",
    color: colors.dropdownLabel,
    marginBottom: 8,
    textAlign: "right", // Align label to the right
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dropdownBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dropdownBorder,
    paddingVertical: 12,
    paddingHorizontal: 15,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: FontSizes.medium,
    color: colors.dropdownText,
    textAlign: "right", // Align text to the right
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.dropdownModalOverlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.dropdownModalBackground,
    borderRadius: 12,
    width: "90%",
    maxHeight: "70%",
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.dropdownSearchBorder,
    paddingBottom: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.medium,
    paddingVertical: 8,
    textAlign: "right", // Align search input text to the right
  },
  optionItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.dropdownOptionBorder,
  },
  optionText: {
    fontSize: FontSizes.medium,
    color: colors.dropdownText,
    textAlign: "right", // Align option text to the right
  },
  noOptionsText: {
    textAlign: "center",
    paddingVertical: 20,
    color: colors.dropdownNoOptionsText,
    fontSize: FontSizes.medium,
  },
});
