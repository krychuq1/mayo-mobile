import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

/** Orange "Mayo" wordmark from mayo-fe (public/logo.svg, 255x98). */
export function MayoLogo({ width = 130 }: { width?: number }) {
  return (
    <Image
      source={require('../../assets/images/mayo-logo.svg')}
      style={[styles.logo, { width, height: width * (98 / 255) }]}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'flex-start' },
});
