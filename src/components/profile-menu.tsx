import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

/** "mój profil" pill + dropdown from the Claude Design product-detail template. */
export function ProfileMenu({ onSignOut }: { onSignOut: () => void }) {
  const [open, setOpen] = useState(false);

  const openDane = () => {
    setOpen(false);
    router.navigate('/dane'); // navigate (not push): no duplicate when already on /dane
  };

  const openPlatnosc = () => {
    setOpen(false);
    router.navigate('/platnosc');
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.button}
        onPress={() => setOpen((v) => !v)}
        hitSlop={4}>
        <Text style={styles.buttonText}>mój profil</Text>
        <Image
          source={
            open
              ? require('../../assets/images/chevron-up.svg')
              : require('../../assets/images/chevron-down.svg')
          }
          style={styles.chevron}
        />
      </Pressable>

      {open && (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={openDane}>
            <Text style={styles.menuItemText}>dane</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={openPlatnosc}>
            <Text style={styles.menuItemText}>płatność</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setOpen(false);
              onSignOut();
            }}>
            <Image
              source={require('../../assets/images/logout.svg')}
              style={styles.logoutIcon}
            />
            <Text style={styles.signOutText}>wyloguj się</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: colors.heading,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.heading,
  },
  chevron: { width: 14, height: 14 },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    minWidth: 170,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 6,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.inputBorder,
    marginVertical: 6,
    marginHorizontal: 8,
  },
  logoutIcon: { width: 14, height: 14 },
  signOutText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.error,
  },
});
