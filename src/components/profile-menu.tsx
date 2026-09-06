import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

/**
 * "Mój profil" bare button + dropdown — Claude Design
 * templates/app-header/AppHeader.dc.html: user icon + 15px semibold dark
 * label + chevron (no pill), menu 8px below with Moje dane / Subskrypcja /
 * divider / Wyloguj (plain dark labels, no icon — user mockup 2026-09-06).
 */
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
        hitSlop={8}
        accessibilityLabel="Mój profil">
        <Image
          source={require('../../assets/images/user-dark.svg')}
          style={styles.userIcon}
        />
        <Text style={styles.buttonText}>Mój profil</Text>
        <Image
          source={
            open
              ? require('../../assets/images/chevron-up-dark.svg')
              : require('../../assets/images/chevron-down-dark.svg')
          }
          style={styles.chevron}
        />
      </Pressable>

      {open && (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={openDane}>
            <Text style={styles.menuItemText}>Moje dane</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={openPlatnosc}>
            <Text style={styles.menuItemText}>Subskrypcja</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setOpen(false);
              onSignOut();
            }}>
            <Text style={styles.menuItemText}>Wyloguj</Text>
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
    gap: 8,
  },
  userIcon: { width: 16, height: 16 },
  buttonText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  chevron: { width: 14, height: 14 },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
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
    fontFamily: fonts.regular,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.inputBorder,
    marginVertical: 6,
    marginHorizontal: 8,
  },
});
