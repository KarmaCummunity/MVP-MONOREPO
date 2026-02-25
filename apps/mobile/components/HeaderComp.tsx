import React, { useState } from "react";
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import MenuComp from "../components/MenuComp";
import ModeToggleButton from "../components/ModeToggleButton";
import GuestModeNotice from "../components/GuestModeNotice";
import colors from "../globals/colors";
import { getScreenInfo, scaleSize, rowDirection, responsiveSpacing, responsiveFontSize, BREAKPOINTS, getScreenInfo as getScreen } from "../globals/responsive";
import { FontSizes } from "../globals/constants";
import { useUser } from "../stores/userStore";
import { useTranslation } from 'react-i18next';
import { createShadowStyle } from "../globals/styles";

// TODO: Add comprehensive TypeScript interfaces for all props instead of loose types
// TODO: Implement proper component composition instead of props drilling
// TODO: Add comprehensive accessibility support (roles, labels, hints)
// TODO: Implement proper responsive design for different screen sizes
// TODO: Add comprehensive error handling for search operations
// TODO: Extract search logic to custom hook (useHeaderSearch)
// TODO: Add proper memoization with React.memo for performance
// TODO: Implement proper theming system integration
// TODO: Add comprehensive unit tests for all component functionality
// TODO: Remove hardcoded styles and use theme system consistently

// TODO: Create proper TypeScript interfaces in separate types file
// TODO: Add JSDoc documentation for all interface properties
// TODO: Replace 'any[]' with proper generic types
// TODO: Add validation for required vs optional props
interface HeaderSectionProps {
  mode: boolean;  // false = search, true = offer
  menuOptions: string[];
  onToggleMode: () => void;
  onSelectMenuItem: (option: string) => void;
  title?: string; // Optional title for the screen
  placeholder?: string;
  // New props for search functionality
  filterOptions: string[]; // Filter options specific to each screen
  sortOptions: string[]; // Sort options specific to each screen
  searchData: any[]; // Data array to search through (charities, rides, etc.) - TODO: Replace any[] with proper types
  onSearch: (query: string, filters?: string[], sorts?: string[], results?: any[]) => void; // Search handler function - TODO: Improve typing
  hideSortButton?: boolean;
}

const HeaderComp: React.FC<HeaderSectionProps> = ({
  mode,
  menuOptions,
  onToggleMode,
  onSelectMenuItem,
  placeholder,
  filterOptions,
  sortOptions,
  searchData,
  onSearch,
  hideSortButton = false,
}) => {
  const { isGuestMode } = useUser();
  const { t } = useTranslation(['search', 'common', 'trump']);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const removeFilterRef = React.useRef<((filter: string) => void) | null>(null);
  const removeSortRef = React.useRef<(() => void) | null>(null);

  const { isTablet, isDesktop, isLargeDesktop, width } = getScreenInfo();
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;
  // Responsive padding and margins using responsiveSpacing for better mobile support
  // Values are optimized for mobile web experience
  const horizontalPadding = responsiveSpacing(8, 10, isLargeDesktop ? 16 : 12);
  const containerRadius = scaleSize(isLargeDesktop ? 28 : isDesktopWeb ? 24 : isTablet ? 22 : 20);
  const verticalPadding = responsiveSpacing(5, 6, isLargeDesktop ? 8 : 7);
  const marginHorizontal = responsiveSpacing(5, 7, isLargeDesktop ? 10 : 8);

  const handleRemoveFilter = (filterToRemove: string) => {
    removeFilterRef.current?.(filterToRemove);
  };

  const handleRemoveSort = () => {
    removeSortRef.current?.();
  };

  const handleFiltersChange = (filters: string[]) => {
    setSelectedFilters(filters);
  };

  const handleSortsChange = (sorts: string[]) => {
    setSelectedSorts(sorts);
  };

  return (
    <View style={[
      headerStyles.headerContainer,
      {
        paddingHorizontal: horizontalPadding / 2,
        paddingVertical: verticalPadding / 2,
        borderRadius: containerRadius,
        marginHorizontal: marginHorizontal / 2,
      }
    ]}>
      {/* מציג את הבאנר במצב אורח אם המשתמש במצב אורח */}
      {isGuestMode && (
        <GuestModeNotice variant="compact" showLoginButton={true} />
      )}

      <View style={[headerStyles.topRow, { flexDirection: rowDirection('row') }]}>
        <View style={headerStyles.menuWrapper}>
          <MenuComp options={menuOptions} onSelectOption={onSelectMenuItem} />
        </View>
        <View style={headerStyles.searchBarWrapper}>
          <SearchBar
            placeholder={placeholder}
            filterOptions={filterOptions}
            sortOptions={sortOptions}
            searchData={searchData}
            onSearch={onSearch}
            onFiltersChange={handleFiltersChange}
            onSortsChange={handleSortsChange}
            onRemoveFilterRequested={(fn) => { removeFilterRef.current = fn; }}
            onRemoveSortRequested={(fn) => { removeSortRef.current = fn; }}
            renderSelectedRow={false}
            hideSortButton={hideSortButton}
          />
        </View>
        <View style={headerStyles.toggleWrapper}>
          <ModeToggleButton mode={mode} onToggle={onToggleMode} />
        </View>
      </View>

      {/* Selected Filters & Sorts Row - Full width scrollable */}
      {(selectedFilters.length > 0 || selectedSorts.length > 0) && (
        <View style={headerStyles.selectedRowWrapper}>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={headerStyles.selectedButtonsContainer}
            style={headerStyles.selectedScrollView}
          >
            {/* Sort items */}
            {selectedSorts.length > 0 && (
              <>
                <Text style={headerStyles.rowLabelInline}>{t('search:sortTitle')}:</Text>
                {selectedSorts.map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={headerStyles.selectedFilterSortButton}
                    onPress={handleRemoveSort}
                  >
                    <Text style={headerStyles.selectedFilterSortButtonText}>
                      {t(`search:sort.${sort}`)}
                    </Text>
                    <Ionicons name="close-circle" size={scaleSize(12)} color={colors.black} style={headerStyles.removeIcon} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Filter items */}
            {selectedFilters.length > 0 && (
              <>
                {selectedSorts.length > 0 && (
                  <Text style={headerStyles.separator}>•</Text>
                )}
                <Text style={headerStyles.rowLabelInline}>{t('search:filterTitle')}:</Text>
                {selectedFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={headerStyles.selectedFilterSortButton}
                    onPress={() => handleRemoveFilter(filter)}
                  >
                    <Text style={headerStyles.selectedFilterSortButtonText}>
                      {/* Try trump:filters first (for trump screen), then search:filters */}
                      {t(`trump:filters.${filter}`, { defaultValue: t(`search:filters.${filter}`, { defaultValue: filter }) })}
                    </Text>
                    <Ionicons name="close-circle" size={scaleSize(12)} color={colors.black} style={headerStyles.removeIcon} />
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

const headerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.pinkLight,
    marginBottom: responsiveSpacing(5, 6, 7),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: responsiveSpacing(8, 10, 12),
    marginTop: responsiveSpacing(10, 12, 14),
    // Dynamic styles applied in JSX for responsive padding and radius
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: "space-between",
    alignItems: "center",
    gap: responsiveSpacing(4, 6, 8), // Responsive gap between elements for better mobile spacing
    width: '100%',
  },
  menuWrapper: {
    flexShrink: 0, // Don't shrink menu icon
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    flex: 1, // Take remaining space
    minWidth: 0, // Allow shrinking below content size
    marginHorizontal: responsiveSpacing(2, 4, 6),
  },
  toggleWrapper: {
    flexShrink: 0, // Don't shrink toggle button
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: responsiveFontSize(FontSizes.body, 17, 19),
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  // Selected Filters & Sorts Row Styles (Full width, thin, scrollable)
  selectedRowWrapper: {
    marginTop: responsiveSpacing(4, 5, 6),
    maxHeight: responsiveSpacing(28, 32, 36),
    width: '100%',
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
    paddingLeft: responsiveSpacing(4, 5, 6),
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
    ...createShadowStyle(colors.black, { width: 0, height: scaleSize(0.5) }, 0.05, scaleSize(1)),
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
});

export default HeaderComp;