import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions, useColorScheme, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScoreEntryScreen from './src/screens/ScoreEntryScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { colors } from './src/theme/colors';

const { width } = Dimensions.get('window');

export default function App() {
  const systemColorScheme = useColorScheme();
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(systemColorScheme === 'dark' ? 'dark' : 'light');
  const slideAnim = useRef(new Animated.Value(width * 0.7)).current;

  // Tema tercihini yükle
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_mode');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeMode(savedTheme);
        }
      } catch (e) {
        console.error("Tema yüklenemedi", e);
      }
    };
    loadTheme();
  }, []);

  // Tema değiştirme fonksiyonu
  const toggleTheme = async () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem('@theme_mode', newMode);
    } catch (e) {
      console.error("Tema kaydedilemedi", e);
    }
  };

  const theme = themeMode === 'dark' ? colors.dark : colors.light;

  const toggleMenu = () => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, {
        toValue: width * 0.7,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const navigateTo = (screen: string) => {
    setCurrentScreen(screen);
    toggleMenu();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={{ flex: 1 }}>
        {/* Mevcut Ekran */}
        {currentScreen === 'Home' ? (
          <ScoreEntryScreen onOpenMenu={toggleMenu} themeMode={themeMode} />
        ) : (
          <HistoryScreen onOpenMenu={toggleMenu} themeMode={themeMode} />
        )}

        {/* Karartma Perdesi */}
        {isMenuOpen && (
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.overlay} 
            onPress={toggleMenu}
          />
        )}

        {/* Sağdan Kayan Menü */}
        <Animated.View 
          style={[
            styles.menuContainer, 
            { backgroundColor: theme.surface, transform: [{ translateX: slideAnim }] }
          ]}
        >
          <View style={styles.menuHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.menuTitle, { color: theme.primary }]}>Menü</Text>
              <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                <Text style={{ fontSize: 28 }}>{themeMode === 'dark' ? '🌙' : '☀️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Home')}>
            <Text style={[styles.menuItemText, { color: currentScreen === 'Home' ? theme.primary : theme.text }]}>Antrenman</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('History')}>
            <Text style={[styles.menuItemText, { color: currentScreen === 'History' ? theme.primary : theme.text }]}>Geçmiş</Text>
          </TouchableOpacity>

          <View style={styles.menuFooter}>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Archer App v1.1</Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: width * 0.7,
    right: 0,
    zIndex: 100,
    paddingTop: 60,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  menuHeader: {
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    paddingBottom: 20,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  themeToggle: {
    padding: 5,
  },
  menuItem: {
    paddingVertical: 15,
    marginBottom: 10,
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuFooter: {
    position: 'absolute',
    bottom: 30,
    left: 20,
  }
});
