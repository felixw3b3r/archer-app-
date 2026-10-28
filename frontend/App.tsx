import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Animated, 
  Dimensions, 
  useColorScheme, 
  SafeAreaView, 
  StatusBar, 
  Image,
  ImageBackground,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StudentDashboard from './src/screens/student/StudentDashboard';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import AuthScreen from './src/screens/auth/AuthScreen';
import { colors } from './src/theme/colors';
import { getCurrentUser, logoutUser, setSessionExpiredHandler, ApiError } from './src/services/api';
import { migrateOwnedHistory, syncRecords } from './src/services/recordStore';

const { width, height } = Dimensions.get('window');
// The drawer must move by at least its own width when closed.  The old
// `width * 0.7` translation was smaller than the drawer (`width * 0.82`),
// leaving a visible strip on the right side of narrow devices.
const MENU_WIDTH = Math.min(width * 0.82, 360);
const MENU_CLOSED_X = MENU_WIDTH + 24;

export default function App() {
  const systemColorScheme = useColorScheme();
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(systemColorScheme === 'dark' ? 'dark' : 'light');
  const slideAnim = useRef(new Animated.Value(MENU_CLOSED_X)).current;
  const [isReady, setIsReady] = useState(false);

  const clearSession = async () => {
    await AsyncStorage.multiRemove(['@auth_token', '@session_expires', '@user_role', '@user_data']);
    setRole(null);
    setUser(null);
    setCurrentScreen('Home');
    setIsMenuOpen(false);
    slideAnim.setValue(MENU_CLOSED_X);
  };

  useEffect(() => {
    setSessionExpiredHandler(() => { void clearSession().catch(console.error); });
    const loadData = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_mode');
        if (savedTheme === 'dark' || savedTheme === 'light') setThemeMode(savedTheme);
        const savedRole = await AsyncStorage.getItem('@user_role');
        const raw = await AsyncStorage.getItem('@user_data');
        const savedUser = raw ? JSON.parse(raw) : null;
        if (savedUser?._id) await migrateOwnedHistory(savedUser._id);
        const token = await AsyncStorage.getItem('@auth_token');
        const expiresAt = await AsyncStorage.getItem('@session_expires');
        if (!savedUser || !token || !expiresAt || Date.parse(expiresAt) <= Date.now()) {
          await clearSession();
          return;
        }
        const { password, passwordHash, teacherKey, token: oldToken, ...safeUser } = savedUser;
        await AsyncStorage.setItem('@user_data', JSON.stringify(safeUser));
        setUser(safeUser);
        setRole(safeUser.role === 'student' ? 'student' : savedRole === 'student' ? 'student' : 'teacher');
        try {
          const current = await getCurrentUser();
          await AsyncStorage.setItem('@user_data', JSON.stringify(current));
          setUser(current);
          if (current.role === 'student') setRole('student');
          void syncRecords('training', current._id).catch(console.error);
          if (current.role === 'teacher') void syncRecords('competition', current._id).catch(console.error);
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) await clearSession();
          // A network failure keeps an unexpired local session usable offline.
        }
      } catch (error) {
        console.error('Oturum yüklenemedi', error);
      } finally { setIsReady(true); }
    };
    void loadData();
    return () => setSessionExpiredHandler(undefined);
  }, []);

  const selectRole = async (selectedRole: 'student' | 'teacher') => {
    try {
      // Eğer halihazırda bir kullanıcı verisi varsa ve rolleri farklıysa, 
      // sadece uyarı ver ama rolü seçmesine izin verme (önce çıkış yapmalı)
      const savedUserData = await AsyncStorage.getItem('@user_data');
      if (savedUserData) {
        const userData = JSON.parse(savedUserData);
        
        // ÖĞRETMEN AYRICALIĞI: Eğer hoca ise her iki tarafa da geçebilir.
        // Ama öğrenci ise sadece öğrenci tarafında kalabilir.
        if (userData.role === 'student' && selectedRole === 'teacher') {
          Alert.alert(
            "Erişim Kilitli!",
            "Öğrenci hesabı ile öğretmen paneline giriş yapamazsınız.",
            [{ text: "Anladım" }]
          );
          return;
        }
      }

      await AsyncStorage.setItem('@user_role', selectedRole);
      setRole(selectedRole);
    } catch (e) {
      console.error("Rol seçimi sırasında hata:", e);
      Alert.alert("Hata", "Rol bilgisi kaydedilemedi.");
    }
  };

  const onLogin = async (selectedRole: 'student' | 'teacher', data: any) => {
    const { token, expiresAt, password, passwordHash, teacherKey, ...userData } = data;
    if (!token || !expiresAt) throw new Error('Sunucu güncellemesi gerekiyor. Oturum açılamadı.');
    await AsyncStorage.multiSet([
      ['@auth_token', token], ['@session_expires', expiresAt],
      ['@user_role', selectedRole], ['@user_data', JSON.stringify(userData)]
    ]);
    setCurrentScreen('Home');
    setRole(selectedRole);
    setUser(userData);
    void syncRecords('training', userData._id).catch(console.error);
    if (userData.role === 'teacher') void syncRecords('competition', userData._id).catch(console.error);
  };

  const logoutRole = async () => {
    try { await logoutUser(); } catch { /* Local logout still works offline. */ }
    await clearSession();
  };

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
        toValue: MENU_CLOSED_X,
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
    // ÖĞRENCİ KISITLAMASI: Eğer öğrenci ise ve öğretmen paneline (Home ekranı aslında hoca paneli oluyor hoca modunda) 
    // geçmeye çalışıyorsa veya hoca ekranlarını istiyorsa ENGELLE
    if (role === 'student' && screen === 'TeacherDashboard') {
      Alert.alert(
        "Yetkisiz Erişim!",
        "Öğrenci hesabı ile öğretmen paneline giriş yapamazsınız. Lütfen önce çıkış yapın.",
        [{ text: "Anladım" }]
      );
      return;
    }
    
    setCurrentScreen(screen);
    toggleMenu();
  };

  if (!isReady) return null;

  // AUTH / GİRİŞ KONTROLÜ
  // Eğer kullanıcı girişi yapılmamışsa AuthScreen'i göster
  if (user === null) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
          <AuthScreen 
            themeMode={themeMode} 
            onLogin={onLogin}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  // ANA UYGULAMA İÇERİĞİ (Giriş Yapıldıktan Sonra)
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      {/* ROL TABANLI EKRAN RENDERI */}
      {role === 'student' ? (
        <StudentDashboard 
          currentScreen={currentScreen} 
          onOpenMenu={toggleMenu} 
          themeMode={themeMode} 
        />
      ) : (
        <TeacherDashboard 
          onOpenMenu={toggleMenu} 
          themeMode={themeMode} 
          theme={theme}
          onLogout={logoutRole}
        />
      )}

      {/* MERKEZİ MENÜ SİSTEMİ (EN ÜST KATMAN) */}
      {isMenuOpen && (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.overlay} 
          onPress={toggleMenu}
        />
      )}

      <Animated.View 
        style={[
          styles.menuContainer, 
          { backgroundColor: theme.surface, transform: [{ translateX: slideAnim }] }
        ]}
      >
        <View style={styles.menuHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[styles.menuTitle, { color: theme.primary }]}>Menü</Text>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
              <Text style={{ fontSize: 28 }}>{themeMode === 'dark' ? '🌙' : '☀️'}</Text>
            </TouchableOpacity>
          </View>

          {/* KULLANICI BİLGİSİ */}
          {user && (
            <View style={{ marginBottom: 20, paddingHorizontal: 5 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 2 }}>Hoş geldin,</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>{user.name} {user.surname}</Text>
            </View>
          )}

          {/* ROL DEĞİŞTİRME İKONLARI */}
          <View style={styles.menuRoleSwitchContainer}>
            <TouchableOpacity 
              style={[styles.menuRoleIconButton, role === 'student' && { borderColor: '#64FFDA', borderWidth: 2 }]} 
              onPress={() => { selectRole('student'); toggleMenu(); }}
            >
              <Image source={require('./assets/student_role.png')} style={styles.menuRoleIcon} />
              <Text style={[styles.menuRoleIconText, { color: role === 'student' ? '#64FFDA' : theme.textSecondary }]}>Öğrenci</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuRoleIconButton, role === 'teacher' && { borderColor: '#64FFDA', borderWidth: 2 }]} 
              onPress={() => { selectRole('teacher'); toggleMenu(); }}
            >
              <Image source={require('./assets/teacher_role.png')} style={styles.menuRoleIcon} />
              <Text style={[styles.menuRoleIconText, { color: role === 'teacher' ? '#64FFDA' : theme.textSecondary }]}>Öğretmen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SADECE ÖĞRENCİDE GÖRÜNEN NAVİGASYON */}
        {role === 'student' && (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Home')}>
              <Text style={[styles.menuItemText, { color: currentScreen === 'Home' ? theme.primary : theme.text }]}>◎  Puantaj</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('History')}>
              <Text style={[styles.menuItemText, { color: currentScreen === 'History' ? theme.primary : theme.text }]}>◷  Geçmiş</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 1, backgroundColor: 'rgba(128,128,128,0.1)', marginVertical: 20 }} />

        <TouchableOpacity style={styles.menuItem} onPress={logoutRole}>
          <Text style={[styles.menuItemText, { color: theme.textSecondary }]}>Çıkış Yap / Rol Seçimi</Text>
        </TouchableOpacity>

        <View style={styles.menuFooter}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Archer App v1.2</Text>
        </View>
      </Animated.View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  roleContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  roleCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleContent: {
    alignItems: 'center',
    padding: 20,
  },
  roleImage: {
    width: 140,
    height: 140,
    borderRadius: 25,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
  },
  roleTitleSmall: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64FFDA',
    letterSpacing: 2,
  },
  roleSubtitleSmall: {
    fontSize: 14,
    color: '#E0FBFF',
    marginTop: 5,
    opacity: 0.7,
    letterSpacing: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    right: 0,
    zIndex: 100,
    paddingTop: 64,
    paddingHorizontal: 20,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.12)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
  },
  menuHeader: {
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    paddingBottom: 20,
  },
  menuTitle: {
    fontSize: 25,
    fontWeight: '800',
  },
  themeToggle: {
    padding: 5,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '800',
  },
  menuFooter: {
    position: 'absolute',
    bottom: 30,
    left: 20,
  },
  menuRoleSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingBottom: 10,
  },
  menuRoleIconButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    width: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  menuRoleIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    marginBottom: 5,
  },
  menuRoleIconText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSub: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  backButton: {
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  teacherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  teacherTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 5,
  }
});
