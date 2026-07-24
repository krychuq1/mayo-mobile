/**
 * Design tokens ported from mayo-fe:
 *   src/app/styles/colors.scss, input.scss, buttons.scss, fonts.scss
 * Keep in sync with the web app when the brand changes.
 */
export const colors = {
  background: '#FFF7E3',
  // web: linear-gradient(349deg, #FFECBC 35.11%, #FFF7E3 96.19%)
  gradientTop: '#FFF7E3',
  gradientBottom: '#FFECBC',
  primary: '#F77710',
  text: '#1E1E1E',
  heading: '#063DBF',
  fontWhite: '#F5F5F5',
  error: '#900B09',
  inputBackground: '#FFFFFF',
  inputBorder: '#D9D9D9',
  inputBorderFocus: '#A8A8A8',
  placeholder: '#B3B3B3',
  muted: '#6F6F6F',
};

export const fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

/** mayo-fe .mayo-input */
export const inputStyle = {
  borderWidth: 1,
  borderColor: colors.inputBorder,
  backgroundColor: colors.inputBackground,
  color: '#000000',
  padding: 16,
  borderRadius: 8,
  fontSize: 16,
  fontFamily: fonts.regular,
} as const;

/** mayo-fe .primary-button (orange pill) */
export const primaryButtonStyle = {
  backgroundColor: colors.primary,
  borderRadius: 28,
  padding: 16,
  alignItems: 'center' as const,
};

export const primaryButtonTextStyle = {
  color: '#FAFAFA',
  fontSize: 16,
  fontFamily: fonts.regular,
} as const;
