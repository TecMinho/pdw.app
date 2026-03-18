import { Appearance } from 'react-native';
import {Colors} from 'react-native-ui-lib';

interface ColorSchemaProps {
  text: string;
  title: string;
  textMuted: string;
  background: string;
  tint: string;
  image: { getTintColor: () => string|undefined };
  tabIconDefault: string;
  tabIconSelected: string;
  primary: { text: string, background: string, lighterBackground?: string};
  secondary: { text: string, background: string, lighterBackground?: string};
  success?: { text: string, background: string, lighterBackground?: string};
  danger?: { text: string, background: string, lighterBackground?: string};
  warning?: { text: string, background: string, lighterBackground?: string};
}


const colorScheme = Appearance.getColorScheme() || 'light';

const textColorDefault = '#111';
const tintColorLight = '#39AD70';
const tintColorDark = '#39AD70';


const light: ColorSchemaProps = {
  text: '#111',
  title: tintColorLight,
  textMuted: '#303030',
  background: '#fff',
  tint: tintColorLight,
  image: {
    getTintColor: () => undefined,
  },
  tabIconDefault: '#ccc',
  tabIconSelected: tintColorLight,
  primary: {
    text: "#fff",
    background: tintColorLight,
  },
  secondary: {
    text: "#fff",
    background: "#71717b",
  },
  success: {
    text: "#fff",
    background: "#00bc7d",
    lighterBackground: "#e7fff5"
  },
  danger: {
    text: "#fff",
    background: "#ec003f",
    lighterBackground: "#ffccd3",
  },
  warning: {
    text: "#fff",
    background: "#ff6900",
    lighterBackground: "#fcecd9",
  },
};


const dark: ColorSchemaProps = {
  text: '#fff',
  title: tintColorDark,
  textMuted: '#A0A0A0',
  background: '#121212',
  tint: tintColorDark,
  image: {
    getTintColor: () => '#ffffffdd',
  },
  tabIconDefault: '#ccc',
  tabIconSelected: tintColorDark,
  primary: {
    text: "#fff",
    background: tintColorLight,
  },
  secondary: {
    text: "#fff",
    background: "#71717b",
  },
  success: {
    text: "#fff",
    background: "#00bc7d",
    lighterBackground: "#e7fff5"
  },
  danger: {
    text: "#fff",
    background: "#ec003f",
    lighterBackground: "#ffccd3",
  },
  warning: {
    text: "#fff",
    background: "#ff6900",
    lighterBackground: "#fcecd9",
  },
};

// Load custom colors and schemes into react-native-ui-lib
Colors.loadColors({
  error: '#ff2442',
  success: '#00CD8B',
  text: '#20303C'
});

Colors.loadSchemes({
  light: {
    $textDefault: "#111",
    $textPrimary: tintColorLight,
    $textSuccess: "#00bc7d",
    $textSuccessLight: "#e7fff5",
    $textDanger: "#ec003f",
    $outlinePrimary: tintColorLight,
    
    $backgroundPrimaryHeavy: tintColorLight,
    $backgroundSuccessHeavy: "#00bc7d",
    $backgroundSuccessLight: "#e7fff5",
    $backgroundDangerHeavy: "#ec003f",
    $backgroundDangerLight: "#ffccd3",
  },
  dark: {
    $textDefault: "#fff",
    $textPrimary: tintColorDark,
    $textSuccess: "#00bc7d",
    $textSuccessLight: "#e7fff5",
    $textDanger: "#ec003f",

    $outlinePrimary: tintColorDark,
    
    $backgroundPrimaryHeavy: tintColorDark,
    $backgroundSuccessHeavy: "#00bc7d",
    $backgroundSuccessLight: "#e7fff5",
    $backgroundDangerHeavy: "#ec003f",
    $backgroundDangerLight: "#ffccd3",
  }
});


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
  textColorDefault,
  current: colorScheme === 'dark' ? dark : light,
};
