import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';

type Filter = 'Pending' | 'Completed' | 'All';
type SortBy = 'priority' | 'createdAt' | 'dueDate';
type SortOrder = 'asc' | 'desc';

interface FilterSortOptionsProps {
  currentFilter: Filter;
  onSelectFilter: (filter: Filter) => void;
  currentSortBy: SortBy;
  onSelectSortBy: (sortBy: SortBy) => void;
  currentSortOrder: SortOrder;
  onToggleSortOrder: () => void;
}

const FilterSortOptions: React.FC<FilterSortOptionsProps> = ({
  currentFilter,
  onSelectFilter,
  currentSortBy,
  onSelectSortBy,
  currentSortOrder,
  onToggleSortOrder,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Text style={styles.label}>Filter:</Text>
        {['Pending', 'Completed', 'All'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.optionButton,
              currentFilter === filter && styles.selectedOption,
            ]}
            onPress={() => onSelectFilter(filter as Filter)}
          >
            <Text
              style={[
                styles.optionText,
                currentFilter === filter && styles.selectedOptionText,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sortContainer}>
        <Text style={styles.label}>Sort By:</Text>
        {['priority', 'createdAt', 'dueDate'].map((sortBy) => (
          <TouchableOpacity
            key={sortBy}
            style={[
              styles.optionButton,
              currentSortBy === sortBy && styles.selectedOption,
            ]}
            onPress={() => onSelectSortBy(sortBy as SortBy)}
          >
            <Text
              style={[
                styles.optionText,
                currentSortBy === sortBy && styles.selectedOptionText,
              ]}
            >
              {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.sortOrderButton} onPress={onToggleSortOrder}>
          <Icon
            name={currentSortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
            size={20}
            color={colors.info}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningLight,
    padding: 10,
    borderRadius: 10,
    // marginBottom: 20,
    elevation: 1,
    // shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 10,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSizes.small,
    fontWeight: 'bold',
    marginRight: 10,
    color: colors.textPrimary,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 4,
  },
  selectedOption: {
    backgroundColor: colors.info,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: FontSizes.caption,
  },
  selectedOptionText: {
    color: colors.white,
  },
  sortOrderButton: {
    marginLeft: 10,
    padding: 5,
  },
});

export default FilterSortOptions;