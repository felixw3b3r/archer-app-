import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar
} from 'react-native';
import { colors } from '../../theme/colors';
import { registerUser, loginUser } from '../../services/api';

const { width } = Dimensions.get('window');

interface AuthScreenProps {
  onLogin: (role: 'student' | 'teacher', userData: any) => void | Promise<void>;
  themeMode: 'dark' | 'light';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, themeMode }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [teacherKey, setTeacherKey] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const theme = themeMode === 'dark' ? colors.dark : colors.light;

  // GG/AA/YYYY Maskeleme ve Temizleme
  const handleDobChange = (text: string) => {
    // Sadece rakamları al
    let cleaned = text.replace(/\D/g, '');
    
    // Formatlama: GG/AA/YYYY
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }
    
    setDob(formatted);
  };

  const validateDate = (dateStr: string) => {
    if (dateStr.length !== 10) return false;
    
    const [day, month, year] = dateStr.split('/').map(Number);
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1940 || year > new Date().getFullYear()) return false;

    // Ay gün kontrolü (Örn: Şubat 30 olamaz)
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const handleAuth = async () => {
    if (!name.trim() || !surname.trim()) {
      Alert.alert("Hata", "Lütfen adınızı ve soyadınızı girin.");
      return;
    }

    if (authMode === 'register' && !validateDate(dob)) {
      Alert.alert("Hata", "Geçerli bir doğum tarihi girin (GG/AA/YYYY).");
      return;
    }

    if (!password || (authMode === 'register' && password.length < 4)) {
      Alert.alert("Hata", "Şifre en az 4 haneli olmalıdır.");
      return;
    }

    if (role === 'teacher' && authMode === 'register' && !teacherKey) {
      Alert.alert("Hata", "Öğretmen kaydı için anahtar gereklidir.");
      return;
    }

    try {
      setIsLoading(true);
      let result;
      if (authMode === 'register') {
        result = await registerUser({
          name: name.trim(),
          surname: surname.trim(),
          dob,
          role,
          password: password,
          teacherKey: role === 'teacher' ? teacherKey : undefined
        });
      } else {
        result = await loginUser({
          name: name.trim(),
          surname: surname.trim(),
          role,
          password: password,
          activationCode: activationCode.trim()
        });
      }
      
      // Başarılı Giriş/Kayıt
      await onLogin(role, result);
    } catch (err: any) {
      Alert.alert("Hata", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>● OKÇULUK AKADEMİSİ</Text>
          <Text style={[styles.title, { color: theme.text }]}>Archer App</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Odaklan. Kaydet. Geliş.</Text>
        </View>

        {/* ROL SEÇİMİ (YAN YANA) */}
        <View style={[styles.roleTabContainer, { backgroundColor: theme.scoreBackground, borderColor: theme.borderSoft }]}>
          <TouchableOpacity 
            style={[styles.roleTab, role === 'student' && { backgroundColor: theme.primary }]}
            onPress={() => setRole('student')}
          >
            <Text style={[styles.roleTabText, { color: role === 'student' ? '#000' : theme.textSecondary }]}>ÖĞRENCİ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.roleTab, role === 'teacher' && { backgroundColor: theme.primary }]}
            onPress={() => setRole('teacher')}
          >
            <Text style={[styles.roleTabText, { color: role === 'teacher' ? '#000' : theme.textSecondary }]}>ÖĞRETMEN</Text>
          </TouchableOpacity>
        </View>

        {/* FORM ALANI */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>ADINIZ</Text>
            <TextInput 
              style={[styles.input, { color: theme.text, borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
              placeholderTextColor={theme.textSecondary + '80'}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>SOYADINIZ</Text>
            <TextInput 
              style={[styles.input, { color: theme.text, borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
              placeholderTextColor={theme.textSecondary + '80'}
              value={surname}
              onChangeText={setSurname}
            />
          </View>

          {authMode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>DOĞUM TARİHİ</Text>
              <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
                placeholder="GG/AA/YYYY"
                placeholderTextColor={theme.textSecondary + '80'}
                keyboardType="numeric"
                maxLength={10}
                value={dob}
                onChangeText={handleDobChange}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>ŞİFRE</Text>
            <TextInput 
              style={[styles.input, { color: theme.text, borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
              placeholder="****"
              placeholderTextColor={theme.textSecondary + '80'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {role === 'teacher' && authMode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>ÖĞRETMEN ANAHTARI</Text>
              <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
                placeholder="5 Haneli Kod"
                placeholderTextColor={theme.textSecondary + '80'}
                autoCapitalize="characters"
                maxLength={5}
                value={teacherKey}
                onChangeText={setTeacherKey}
              />
            </View>
          )}

          {role === 'student' && authMode === 'login' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>İLK GİRİŞ KODU (VARSA)</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
                placeholder="Öğretmeninizin verdiği kod"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                value={activationCode}
                onChangeText={setActivationCode}
              />
              <Text style={{ color: theme.textSecondary, marginTop: 8 }}>İlk girişte kodunuzu ve kullanmak istediğiniz yeni şifreyi girin.</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'BEKLEYİN...' : (authMode === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL VE BAŞLA')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toggleAuthMode}
            onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          >
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 20 }}>
              {authMode === 'login' ? "Hesabın yok mu? Yeni Kayıt Oluştur" : "Zaten hesabın var mı? Giriş Yap"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  toggleAuthMode: { paddingVertical: 10 },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 30,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 40 : 80,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    padding: 26,
    borderRadius: 30,
    borderWidth: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: .3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 12,
  },
  roleTabContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 5,
    marginBottom: 26,
    borderWidth: 1,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 999,
  },
  roleTabText: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 5,
    letterSpacing: 1,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  submitButton: {
    height: 60,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});

export default AuthScreen;
