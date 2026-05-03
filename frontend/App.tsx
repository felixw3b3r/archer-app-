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
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StudentDashboard from './src/screens/student/StudentDashboard';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import { colors } from './src/theme/colors';

const { width, height } = Dimensions.get('window');

export default function App() {
  const systemColorScheme = useColorScheme();
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(systemColorScheme === 'dark' ? 'dark' : 'light');
  const slideAnim = useRef(new Animated.Value(width * 0.7)).current;

  // Başlangıçta Tema ve Rolü yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_mode');
        const savedRole = await AsyncStorage.getItem('@user_role');
        
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeMode(savedTheme);
        }
        if (savedRole === 'student' || savedRole === 'teacher') {
          setRole(savedRole as 'student' | 'teacher');
        }
      } catch (e) {
        console.error("Veriler yüklenemedi", e);
      }
    };
    loadData();
  }, []);

  const selectRole = async (selectedRole: 'student' | 'teacher') => {
    setRole(selectedRole);
    try {
      await AsyncStorage.setItem('@user_role', selectedRole);
    } catch (e) {
      console.error("Rol kaydedilemedi", e);
    }
  };

  const logoutRole = async () => {
    setRole(null);
    setIsMenuOpen(false);
    try {
      await AsyncStorage.removeItem('@user_role');
    } catch (e) {
      console.error("Rol silinemedi", e);
    }
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

  // ROL SEÇİM EKRANI
  if (role === null) {
    const isDark = themeMode === 'dark';
    const bgColor = isDark ? '#040B14' : '#F8FAFC';
    const textColor = isDark ? '#64FFDA' : '#0F172A';
    const subTextColor = isDark ? '#E0FBFF' : '#64748B';
    const borderColor = isDark ? 'rgba(100, 255, 218, 0.3)' : 'rgba(0, 0, 0, 0.1)';
    const separatorColor = isDark ? 'rgba(100, 255, 218, 0.2)' : 'rgba(0, 0, 0, 0.05)';
    const imageBg = isDark ? 'transparent' : '#FFFFFF';

    return (
      <View style={[styles.roleContainer, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bgColor} />
        
        {/* ÖĞRENCİ SEÇENEĞİ */}
        <TouchableOpacity 
          style={styles.roleCard} 
          activeOpacity={0.7}
          onPress={() => selectRole('student')}
        >
          <View style={styles.roleContent}>
            <Image 
              source={require('./assets/student_role.png')} 
              style={[styles.roleImage, { borderColor: borderColor, backgroundColor: imageBg, borderWidth: 1 }]}
            />
            <Text style={[styles.roleTitleSmall, { color: textColor }]}>ÖĞRENCİ</Text>
            <Text style={[styles.roleSubtitleSmall, { color: subTextColor }]}>Antrenman ve Gelişim</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 2, backgroundColor: separatorColor, width: '80%', alignSelf: 'center' }} />

        {/* ÖĞRETMEN SEÇENEĞİ */}
        <TouchableOpacity 
          style={styles.roleCard} 
          activeOpacity={0.7}
          onPress={() => selectRole('teacher')}
        >
          <View style={styles.roleContent}>
            <Image 
              source={require('./assets/teacher_role.png')} 
              style={[styles.roleImage, { borderColor: borderColor, backgroundColor: imageBg, borderWidth: 1 }]}
            />
            <Text style={[styles.roleTitleSmall, { color: textColor }]}>ÖĞRETMEN</Text>
            <Text style={[styles.roleSubtitleSmall, { color: subTextColor }]}>Analiz ve Takip</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ANA UYGULAMA İÇERİĞİ (Giriş Yapıldıktan Sonra)
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={[styles.menuTitle, { color: theme.primary }]}>Menü</Text>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
              <Text style={{ fontSize: 28 }}>{themeMode === 'dark' ? '🌙' : '☀️'}</Text>
            </TouchableOpacity>
          </View>

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
              <Text style={[styles.menuItemText, { color: currentScreen === 'Home' ? theme.primary : theme.text }]}>Antrenman</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('History')}>
              <Text style={[styles.menuItemText, { color: currentScreen === 'History' ? theme.primary : theme.text }]}>Geçmiş</Text>
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
    </SafeAreaView>
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
    borderRadius: 15,
    width: '45%',
    backgroundColor: 'rgba(128,128,128,0.05)',
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
