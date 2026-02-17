import { Appearance } from 'react-native';

const tintColorLight = '#39AD70';
const tintColorDark = '#39AD70';


const colorScheme = Appearance.getColorScheme() || 'light';

const light = {
  text: '#111',
  title: tintColorLight,
  textMuted: '303030',
  background: '#fff',
  tint: tintColorLight,
  tabIconDefault: '#ccc',
  tabIconSelected: tintColorLight,
  primary: {
    text: "#fff",
    background: tintColorLight,
  }
};

const dark = {
  text: '#fff',
  title: tintColorDark,
  textMuted: '#A0A0A0',
  background: '#111',
  tint: tintColorDark,
  tabIconDefault: '#ccc',
  tabIconSelected: tintColorDark,
  primary: {
    text: "#fff",
    background: tintColorDark,
  }
};

/**
 * Centralized color system export
 * 
 * Provides a comprehensive color palette organized by theme modes.
 * Each theme contains semantic color definitions that adapt to the
 * user's preferred interface style while maintaining consistency
 * and accessibility standards.
 */
export default {
  light,
  dark,
  current: colorScheme === 'dark' ? dark : light,
};
