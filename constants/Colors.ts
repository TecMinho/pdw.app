const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

/**
 * Centralized color system export
 * 
 * Provides a comprehensive color palette organized by theme modes.
 * Each theme contains semantic color definitions that adapt to the
 * user's preferred interface style while maintaining consistency
 * and accessibility standards.
 */
export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
