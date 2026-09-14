import { useWindowDimensions } from 'react-native';

// Smallest dimension of common 7"+ Android tablets / iPads is >= 600dp,
// which is also the breakpoint Android itself uses for tablet resources.
export const TABLET_MIN_DIMENSION = 600;

/**
 * Window-size driven responsive helpers. Uses useWindowDimensions so every
 * value updates automatically on rotation, foldable posture changes and
 * split-screen resizes (a static Dimensions.get would go stale).
 */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  const isTablet = Math.min(width, height) >= TABLET_MIN_DIMENSION;
  const isLandscape = width > height;

  return {
    width,
    height,
    isTablet,
    fontScale,
    isLandscape,
    // Readable line-length caps for different kinds of content. Phones get
    // no cap (undefined maxWidth is ignored by RN styles).
    formMaxWidth: isTablet ? 680 : undefined,
    workspaceFormMaxWidth: isTablet ? 1120 : undefined,
    contentMaxWidth: isTablet ? (isLandscape ? 1120 : 920) : undefined,
    wideMaxWidth: isTablet ? 1440 : undefined,
    useNavigationRail:
      isTablet && width >= 1100 && isLandscape && fontScale <= 1.3,
  };
}

export const getGridColumns = (
  width,
  fontScale = 1,
  minColumnWidth = 340,
  maxColumns = 2,
  gap = 16,
) =>
  Math.max(
    1,
    Math.min(
      maxColumns,
      Math.floor(
        (width + gap) / (minColumnWidth * Math.max(1, fontScale) + gap),
      ),
    ),
  );

/**
 * Style fragment that keeps a block phone-full-width but caps and centers
 * it on tablets. Spread into a ScrollView contentContainerStyle or a View.
 */
export function centeredContent(maxWidth) {
  if (!maxWidth) {
    return null;
  }

  return { width: '100%', maxWidth, alignSelf: 'center' };
}

/**
 * Percentage width for grid children so tablets get more columns from the
 * same flexWrap row (e.g. gridItemWidth(2, 4) => '48%' phone, '23%' tablet).
 */
export function gridItemWidth(phoneColumns, tabletColumns, isTablet) {
  const columns = isTablet ? tabletColumns : phoneColumns;

  // Leave ~2% per item for the container's gap.
  return `${Math.floor(100 / columns) - 2}%`;
}
