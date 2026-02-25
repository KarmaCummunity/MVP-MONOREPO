import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Ensure @expo/vector-icons is installed
import colors from "../globals/colors"; // Ensure this path is correct
import { FontSizes, filterOptions as defaultFilterOptions, sortOptions as defaultSortOptions } from "../globals/constants";
import { useTranslation } from 'react-i18next';
import { createShadowStyle } from "../globals/styles";
import { biDiTextAlign, rowDirection, getResponsiveModalStyles, responsiveSpacing, responsiveFontSize, getScreenInfo, BREAKPOINTS, scaleSize } from "../globals/responsive";

/** Minimal shape for searchable items (name, description, location) used in search/filter. */
export interface SearchableItem {
  name?: string;
  description?: string;
  location?: string;
  [key: string]: unknown;
}

interface SearchBarProps {
  onHasActiveConditionsChange?: (isActive: boolean) => void;
  onSearch?: (query: string, filters?: string[], sorts?: string[], results?: SearchableItem[]) => void;
  placeholder?: string;
  // New props for dynamic filter/sort options and search data (optional for backward compatibility)
  filterOptions?: string[];
  sortOptions?: string[];
  searchData?: SearchableItem[];
  // Props to expose selected filters/sorts to parent
  onFiltersChange?: (filters: string[]) => void;
  onSortsChange?: (sorts: string[]) => void;
  // Callbacks to expose remove functions to parent
  onRemoveFilterRequested?: (removeFn: (filter: string) => void) => void;
  onRemoveSortRequested?: (removeFn: () => void) => void;
  // Whether to render the selected filters/sorts row (false = parent will render it)
  renderSelectedRow?: boolean;
  // Whether to hide the sort button explicitly
  hideSortButton?: boolean;
}

const SearchBar = ({
  onHasActiveConditionsChange,
  onSearch,
  placeholder,
  filterOptions = defaultFilterOptions,
  sortOptions = defaultSortOptions,
  searchData = [],
  onFiltersChange,
  onSortsChange,
  onRemoveFilterRequested,
  onRemoveSortRequested,
  renderSelectedRow = true,
  hideSortButton = false,
}: SearchBarProps) => {
  const [searchText, setSearchText] = useState("");
  const { t } = useTranslation(['search', 'common', 'trump']);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);

  // Derive active conditions and notify parent when they change (no local state to avoid setState-in-effect)
  const hasActiveConditions = selectedFilters.length > 0 || selectedSorts.length > 0;
  useEffect(() => {
    onHasActiveConditionsChange?.(hasActiveConditions);
  }, [hasActiveConditions, onHasActiveConditionsChange]);

  // Function to perform search with given parameters
  const performSearch = useCallback((query: string, filters: string[], sorts: string[]) => {
    // For backward compatibility, if no searchData is provided, just call onSearch with basic parameters
    if (searchData.length === 0) {
      onSearch?.(query, filters, sorts, []);
      return;
    }

    // Perform search on the provided data
    let results = [...searchData];

    // Filter by search text if provided
    if (query.trim() !== "") {
      const q = query.toLowerCase();
      results = results.filter(item => {
        // Enhanced search for charities - check specific fields first
        if (String(item.name ?? '').toLowerCase().includes(q)) return true;
        if (String(item.description ?? '').toLowerCase().includes(q)) return true;
        if (String(item.location ?? '').toLowerCase().includes(q)) return true;
        if (String(item.category ?? '').toLowerCase().includes(q)) return true;
        if (String(item.organization ?? '').toLowerCase().includes(q)) return true;
        if (String(item.title ?? '').toLowerCase().includes(q)) return true;
        const itemStr = JSON.stringify(item).toLowerCase();
        return itemStr.includes(q);
      });
    }

    // Apply filters if any are selected
    if (filters.length > 0) {
      results = results.filter(item => {
        return filters.some(filter => {
          const f = filter.toLowerCase();
          if (String(item.category ?? '').toLowerCase().includes(f)) return true;
          if (item.tags && Array.isArray(item.tags)) {
            return item.tags.some((tag: unknown) => String(tag ?? '').toLowerCase().includes(f));
          }
          if (String(item.organization ?? '').toLowerCase().includes(f)) return true;
          const itemStr = JSON.stringify(item).toLowerCase();
          return itemStr.includes(f);
        });
      });
    }

    // Apply sorting if any is selected
    if (sorts.length > 0) {
      const sortOption = sorts[0]; // Only one sort at a time

      // Enhanced sorting logic for charities
      if (sortOption === 'alphabetical') {
        results.sort((a, b) => {
          const aName = String(a.name ?? a.title ?? a.organization ?? '').toLowerCase();
          const bName = String(b.name ?? b.title ?? b.organization ?? '').toLowerCase();
          return aName.localeCompare(bName, 'he');
        });
      } else if (sortOption === 'byLocation') {
        results.sort((a, b) => {
          const aLocation = String(a.location ?? '').toLowerCase();
          const bLocation = String(b.location ?? '').toLowerCase();
          return aLocation.localeCompare(bLocation, 'he');
        });
      } else if (sortOption === 'byCategory') {
        results.sort((a, b) => {
          const aCategory = String(a.category ?? '').toLowerCase();
          const bCategory = String(b.category ?? '').toLowerCase();
          return aCategory.localeCompare(bCategory, 'he');
        });
      } else if (sortOption === 'byDonors') {
        results.sort((a, b) => {
          const aDonors = Number(a.donors ?? a.volunteers ?? 0);
          const bDonors = Number(b.donors ?? b.volunteers ?? 0);
          return bDonors - aDonors; // Descending order
        });
      } else if (sortOption === 'byRating' || sortOption === 'byRelevance') {
        results.sort((a, b) => {
          const aRating = Number(a.rating ?? 0);
          const bRating = Number(b.rating ?? 0);
          return bRating - aRating; // Descending order
        });
      }
    }

    // Call the parent's search handler with all the parameters
    onSearch?.(query, filters, sorts, results);
  }, [searchData, onSearch]);

  const handleSearch = () => {
    performSearch(searchText, selectedFilters, selectedSorts);
  };

  const handleFilterSelection = (option: string) => {
    setSelectedFilters((prevFilters) => {
      const newFilters = prevFilters.includes(option)
        ? prevFilters.filter((item) => item !== option)
        : [...prevFilters, option];

      // Notify parent of filter changes
      onFiltersChange?.(newFilters);

      // Perform real-time search with new filters
      performSearch(searchText, newFilters, selectedSorts);

      return newFilters;
    });
  };

  const handleSortSelection = (option: string) => {
    setSelectedSorts((prevSorts) => {
      const newSorts = prevSorts.includes(option) ? [] : [option];

      // Notify parent of sort changes
      onSortsChange?.(newSorts);

      // Perform real-time search with new sorts
      performSearch(searchText, selectedFilters, newSorts);

      return newSorts;
    });
  };

  const removeFilter = useCallback((filterToRemove: string) => {
    setSelectedFilters((prevFilters) => {
      const newFilters = prevFilters.filter((filter) => filter !== filterToRemove);

      // Notify parent of filter changes
      onFiltersChange?.(newFilters);

      // Perform real-time search with updated filters
      performSearch(searchText, newFilters, selectedSorts);

      return newFilters;
    });
  }, [searchText, selectedSorts, onFiltersChange, performSearch]);

  const removeSort = useCallback((_sortToRemove: string) => {
    setSelectedSorts([]); // Remove all sorts, as typically only one can be active

    // Notify parent of sort changes
    onSortsChange?.([]);

    // Perform real-time search with updated sorts
    performSearch(searchText, selectedFilters, []);
  }, [searchText, selectedFilters, onSortsChange, performSearch]);

  const isFilterSelected = (option: string) => selectedFilters.includes(option);
  const isSortSelected = (option: string) => selectedSorts.includes(option);

  // Handle text input changes
  const handleTextChange = (text: string) => {
    setSearchText(text);

    // Perform real-time search as user types
    performSearch(text, selectedFilters, selectedSorts);
  };

  // Handle search on submit
  const handleSubmitEditing = () => {
    handleSearch();
  };

  // Get responsive styles
  const modalStyles = getResponsiveModalStyles();
  const { isTablet, isDesktop: _isDesktop, isLargeDesktop, width } = getScreenInfo();
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;
  const isMobileWeb = Platform.OS === 'web' && width <= BREAKPOINTS.TABLET;
  // Icon size optimized for mobile web - smaller for better proportions
  const iconSize = isLargeDesktop ? 28 : isDesktopWeb ? 26 : isTablet ? 24 : isMobileWeb ? 20 : 22;
  // Default placeholder if none provided
  const searchPlaceholder = placeholder || t('donations:searchCharitiesForHelp');

  // Expose remove functions to parent component
  React.useEffect(() => {
    onRemoveFilterRequested?.(removeFilter);
    onRemoveSortRequested?.(() => removeSort(''));
  }, [selectedFilters, selectedSorts, onRemoveFilterRequested, onRemoveSortRequested, removeFilter, removeSort]);

  return (
    <View style={localStyles.container}>
      {/* --- Main Search Bar Row --- */}
      <View style={[localStyles.searchBarContainer, { flexDirection: rowDirection('row-reverse') }]}>
        {/* Sort Button (opens sort modal) - Inside search bar, smaller */}
        {!hideSortButton && (
          <TouchableOpacity
            style={localStyles.buttonContainer}
            onPress={() => setIsSortModalVisible(true)}
          >
            <Text style={localStyles.buttonText}>{t('search:sortTitle')}</Text>
          </TouchableOpacity>
        )}

        {/* Filter Button (opens filter modal) - Inside search bar, smaller */}
        <TouchableOpacity
          style={localStyles.buttonContainer}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Text style={localStyles.buttonText}>{t('search:filterTitle')}</Text>
        </TouchableOpacity>

        {/* Search Input Field */}
        <TextInput
          style={[localStyles.searchInput, { textAlign: biDiTextAlign('right') }]}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={searchText}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="search"
        />

        {/* Search Icon - Inside search bar, before input */}
        <TouchableOpacity
          onPress={handleSearch}
          style={localStyles.searchIconContainer}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={iconSize} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* --- Filter Options Modal --- */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isFilterModalVisible}
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <TouchableOpacity
            style={localStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsFilterModalVisible(false)}
          >
            <View style={[
              localStyles.modalContent,
              {
                width: modalStyles.width as DimensionValue,
                maxWidth: modalStyles.maxWidth,
                maxHeight: modalStyles.maxHeight as DimensionValue,
                padding: modalStyles.padding,
                borderRadius: modalStyles.borderRadius,
              }
            ]}>
              <Text style={localStyles.modalTitle}>{t('search:chooseFiltersTitle')}</Text>
              <ScrollView style={localStyles.modalScrollView}>
                {filterOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      localStyles.modalOption,
                      isFilterSelected(option) && localStyles.modalOptionSelected,
                    ]}
                    onPress={() => handleFilterSelection(option)}
                  >
                    <Text
                      style={[
                        localStyles.modalOptionText,
                        isFilterSelected(option) && localStyles.modalOptionTextSelected,
                      ]}
                    >
                      {/* Try trump:filters first (for trump screen), then search:filters */}
                      {t(`trump:filters.${option}`, { defaultValue: t(`search:filters.${option}`, { defaultValue: option }) })}
                    </Text>
                    {isFilterSelected(option) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.secondary}
                        style={localStyles.modalCheckmark}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={localStyles.modalCloseButton}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Text style={localStyles.modalCloseButtonText}>{t('common:close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* --- Sort Options Modal --- */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isSortModalVisible}
          onRequestClose={() => setIsSortModalVisible(false)}
        >
          <TouchableOpacity
            style={localStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsSortModalVisible(false)}
          >
            <View style={[
              localStyles.modalContent,
              {
                width: modalStyles.width as DimensionValue,
                maxWidth: modalStyles.maxWidth,
                maxHeight: modalStyles.maxHeight as DimensionValue,
                padding: modalStyles.padding,
                borderRadius: modalStyles.borderRadius,
              }
            ]}>
              <Text style={localStyles.modalTitle}>{t('search:chooseSortsTitle')}</Text>
              <ScrollView style={localStyles.modalScrollView}>
                {sortOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      localStyles.modalOption,
                      isSortSelected(option) && localStyles.modalOptionSelected,
                    ]}
                    onPress={() => handleSortSelection(option)}
                  >
                    <Text
                      style={[
                        localStyles.modalOptionText,
                        isSortSelected(option) && localStyles.modalOptionTextSelected,
                      ]}
                    >
                      {t(`search:sort.${option}`)}
                    </Text>
                    {isSortSelected(option) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.secondary}
                        style={localStyles.modalCheckmark}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={localStyles.modalCloseButton}
                onPress={() => setIsSortModalVisible(false)}
              >
                <Text style={localStyles.modalCloseButtonText}>{t('common:close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* --- Selected Filters & Sorts Row (Combined, thin, scrollable) --- */}
      {renderSelectedRow && (selectedFilters.length > 0 || selectedSorts.length > 0) && (
        <View style={localStyles.selectedRowWrapper}>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={localStyles.selectedButtonsContainer}
            style={localStyles.selectedScrollView}
          >
            {/* Sort items */}
            {selectedSorts.length > 0 && (
              <>
                <Text style={localStyles.rowLabelInline}>{t('search:sortTitle')}:</Text>
                {selectedSorts.map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={localStyles.selectedFilterSortButton}
                    onPress={() => removeSort(sort)}
                  >
                    <Text style={localStyles.selectedFilterSortButtonText}>
                      {t(`search:sort.${sort}`)}
                    </Text>
                    <Ionicons name="close-circle" size={12} color={colors.black} style={localStyles.removeIcon} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Filter items */}
            {selectedFilters.length > 0 && (
              <>
                {selectedSorts.length > 0 && (
                  <Text style={localStyles.separator}>•</Text>
                )}
                <Text style={localStyles.rowLabelInline}>{t('search:filterTitle')}:</Text>
                {selectedFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={localStyles.selectedFilterSortButton}
                    onPress={() => removeFilter(filter)}
                  >
                    <Text style={localStyles.selectedFilterSortButtonText}>
                      {/* Try trump:filters first (for trump screen), then search:filters */}
                      {t(`trump:filters.${filter}`, { defaultValue: t(`search:filters.${filter}`, { defaultValue: filter }) })}
                    </Text>
                    <Ionicons name="close-circle" size={12} color={colors.black} style={localStyles.removeIcon} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      )}


    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.transparent,
    flex: 1, // Take available space instead of fixed 60%
    minWidth: 0, // Allow shrinking below content size
  },
  searchBarContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: responsiveSpacing(18, 20, 22),
    ...createShadowStyle(colors.black, { width: 0, height: 1 }, 0.08, 2),
    elevation: 2,
    height: scaleSize(32), // Match the height of ModeToggleButton
    paddingVertical: 5, // No vertical padding, height is fixed
    paddingHorizontal: responsiveSpacing(4, 6, 8), // Optimized horizontal padding for mobile web
    borderWidth: 0.5,
    borderColor: colors.black,
    width: '100%',
  },
  buttonContainer: {
    backgroundColor: colors.pinkLight,
    borderRadius: responsiveSpacing(12, 14, 16),
    paddingVertical: responsiveSpacing(1, 2, 3), // Reduced padding to fit in 32px height
    paddingHorizontal: responsiveSpacing(5, 6, 7), // Optimized padding for mobile web
    marginLeft: responsiveSpacing(4, 5, 6), // Better spacing for mobile web
    flexShrink: 0, // Don't shrink buttons
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%', // Match container height
  },
  buttonText: {
    fontSize: responsiveFontSize(FontSizes.caption, 9, 11), // Smaller font for mobile
    color: colors.textSecondary,
    fontWeight: "600",
    writingDirection: "rtl",
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(FontSizes.small, 13, 15),
    color: colors.textSecondary,
    paddingLeft: responsiveSpacing(4, 6, 8),
    paddingRight: responsiveSpacing(2, 3, 4), // Space between input and icon
    paddingVertical: 0,
    minWidth: 0, // Allow shrinking
    height: '100%', // Take full height of container
  },
  searchIconContainer: {
    paddingRight: responsiveSpacing(6, 8, 10), // More padding for better touch target
    paddingLeft: responsiveSpacing(2, 3, 4),
    paddingVertical: 0, // No vertical padding, container height is fixed
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Don't shrink icon container
    minWidth: scaleSize(32), // Minimum touch target size for mobile web
    height: '100%', // Match container height
  },

  // --- Modals Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.overlayDark,
  },
  modalContent: {
    backgroundColor: colors.white,
    // Dynamic styles applied in JSX for responsive sizing
    ...createShadowStyle(colors.black, { width: 0, height: 2 }, 0.25, 4),
    elevation: 5,
  },
  modalTitle: {
    fontSize: responsiveFontSize(FontSizes.heading2, 20, 22),
    fontWeight: "bold",
    marginBottom: responsiveSpacing(15, 18, 20),
    textAlign: "center",
    color: colors.textSecondary,
  },
  modalScrollView: {
    maxHeight: responsiveSpacing(300, 400, 500),
  },
  modalOption: {
    paddingVertical: responsiveSpacing(15, 18, 20),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: rowDirection("row-reverse"),
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: responsiveSpacing(10, 12, 14),
  },
  modalOptionSelected: {
    backgroundColor: colors.warning,
  },
  modalOptionText: {
    fontSize: responsiveFontSize(FontSizes.medium, 16, 18),
    textAlign: "right",
    writingDirection: "rtl",
    color: colors.textPrimary,
    flex: 1,
  },
  modalOptionTextSelected: {
    fontWeight: "bold",
    color: colors.secondary,
  },
  modalCheckmark: {
    marginLeft: responsiveSpacing(10, 12, 14),
  },
  modalCloseButton: {
    marginTop: responsiveSpacing(20, 24, 28),
    backgroundColor: colors.secondary,
    paddingVertical: responsiveSpacing(12, 14, 16),
    borderRadius: responsiveSpacing(8, 10, 12),
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: colors.white,
    fontSize: responsiveFontSize(FontSizes.medium, 16, 18),
    fontWeight: "bold",
  },

  // --- Selected Filter/Sort Rows Styles (Thin, scrollable, single row) ---
  selectedRowWrapper: {
    marginTop: responsiveSpacing(4, 5, 6),
    marginHorizontal: responsiveSpacing(8, 10, 12),
    maxHeight: responsiveSpacing(28, 32, 36),
  },
  selectedScrollView: {
    maxHeight: responsiveSpacing(28, 32, 36),
  },
  rowLabelInline: {
    fontSize: responsiveFontSize(FontSizes.caption, 10, 12),
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: responsiveSpacing(4, 5, 6),
    alignSelf: 'center',
  },
  separator: {
    fontSize: responsiveFontSize(FontSizes.caption, 10, 12),
    color: colors.textTertiary,
    marginHorizontal: responsiveSpacing(4, 5, 6),
    alignSelf: 'center',
  },
  selectedButtonsContainer: {
    flexDirection: "row-reverse",
    gap: responsiveSpacing(4, 5, 6),
    paddingRight: responsiveSpacing(4, 5, 6),
    alignItems: 'center',
    flexGrow: 1,
  },
  selectedFilterSortButton: {
    backgroundColor: colors.pinkLight,
    paddingVertical: responsiveSpacing(2, 3, 4),
    paddingHorizontal: responsiveSpacing(4, 5, 6),
    borderRadius: responsiveSpacing(12, 14, 16),
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: responsiveSpacing(3, 4, 5),
    ...createShadowStyle(colors.black, { width: 0, height: 0.5 }, 0.05, 1),
    elevation: 1,
  },
  selectedFilterSortButtonText: {
    fontSize: responsiveFontSize(FontSizes.caption, 10, 12),
    fontWeight: '600',
    color: colors.black,
  },
  removeIcon: {
    margin: 0,
  },

  // --- Static Filter Buttons Row Styles ---
  staticRowWrapper: {
    marginTop: 10,
    paddingBottom: 10,
    minHeight: 40,
  },
  staticButtonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    flexGrow: 1,
  },
  staticFilterButton: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexShrink: 0,
  },
  staticFilterButtonText: {
    fontSize: FontSizes.small,
    color: colors.black,
  },
});

export default SearchBar;