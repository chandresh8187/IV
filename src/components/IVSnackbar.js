import { Snackbar } from 'react-native-snackbar';
import { COLORS } from '../assets/Colors';

export const IVSnackbar = text => {
  Snackbar.show({
    text: text,
    duration: Snackbar.LENGTH_SHORT,
    backgroundColor: COLORS.primary,
    textColor: COLORS.white,
  });
};
