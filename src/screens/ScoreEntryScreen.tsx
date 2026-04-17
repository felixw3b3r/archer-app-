import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { colors } from '../theme/colors';
import { useScoreEntry } from '../hooks/useScoreEntry';
import { getStyles } from './ScoreEntryScreen.styles';

export default function ScoreEntryScreen({ onOpenMenu, themeMode }: { onOpenMenu: () => void, themeMode: 'dark' | 'light' }) {
  const theme = themeMode === 'dark' ? colors.dark : colors.light;
  
  // Stilleri dış dosyadan alıyoruz
  const styles = getStyles(theme);

  // Bütün matematik ve mantık (Logic/State) işlemlerini Hook'tan çekiyoruz
  const {
    totalSeries,
    setTotalSeries,
    arrowsPerSeries,
    setArrowsPerSeries,
    currentSeries,
    scoreInput,
    totalScore,
    isFinished,
    handleIncrement,
    handleDecrement,
    handleZero,
    handleScoreChange,
    handleSaveScore,
    handleEditPrevious,
    handleReset
  } = useScoreEntry();

  // EĞER ANTRENMAN BİTTİYSE BU EKRANI GÖSTER
  if (isFinished) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <Text style={{ fontSize: 32, color: theme.text, marginBottom: 20 }}>Antrenman Tamamlandı!</Text>
         <Text style={{ fontSize: 80, color: theme.primary, fontWeight: 'bold' }}>{totalScore}</Text>
         <Text style={{ fontSize: 22, color: theme.textSecondary, marginBottom: 50 }}>Toplam Puan</Text>
         
         <TouchableOpacity style={styles.editPreviousButton} onPress={handleEditPrevious}>
            <Text style={styles.editPreviousText}>GERİ AL / DÜZENLE</Text>
         </TouchableOpacity>

         <TouchableOpacity style={styles.saveButton} onPress={handleReset}>
            <Text style={styles.saveButtonText}>YENİ ANTRENMAN</Text>
         </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          
          {/* Üst Kısım: Antrenman Ayarları */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.resetTopButton} onPress={handleReset}>
              <Text style={styles.resetTopButtonText}>↻</Text>
            </TouchableOpacity>
            
            <Text style={styles.title}>Puantaj</Text>

            <TouchableOpacity style={styles.menuButton} onPress={onOpenMenu}>
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
            <View style={styles.settingsRow}>
              <View style={styles.settingBox}>
                <Text style={styles.settingLabel}>Toplam Seri</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => setTotalSeries(Math.max(1, totalSeries - 1))}>
                    <Text style={styles.controlText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.settingValue}>{totalSeries}</Text>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => setTotalSeries(totalSeries + 1)}>
                    <Text style={styles.controlText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingBox}>
                <Text style={styles.settingLabel}>Ok / Seri</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => setArrowsPerSeries(Math.max(1, arrowsPerSeries - 1))}>
                    <Text style={styles.controlText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.settingValue}>{arrowsPerSeries}</Text>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => setArrowsPerSeries(arrowsPerSeries + 1)}>
                    <Text style={styles.controlText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Orta Kısım: Skor Girişi */}
          <View style={styles.mainContent}>
            <Text style={styles.seriesInfo}>Seri {currentSeries} / {totalSeries}</Text>
            
            <View style={styles.scoreInputContainer}>
              {/* Azaltma Butonu */}
              <TouchableOpacity style={styles.scoreControlBtn} onPress={handleDecrement}>
                <Text style={styles.scoreControlText}>-</Text>
              </TouchableOpacity>

              {/* Skor Input (Klavye için) */}
              <View style={styles.scoreInputWrapper}>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="number-pad"
                  value={scoreInput}
                  onChangeText={handleScoreChange}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={3}
                  selectTextOnFocus={true}
                />
              </View>

              {/* Artırma Butonu */}
              <TouchableOpacity style={styles.scoreControlBtn} onPress={handleIncrement}>
                <Text style={styles.scoreControlText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Sıfır (Karavana) Butonu - Simetri için puan girişinin altına alındı */}
            <TouchableOpacity style={styles.zeroButton} onPress={handleZero}>
              <Text style={styles.zeroText}>0 (Karavana)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveScore}>
              <Text style={styles.saveButtonText}>KAYDET</Text>
            </TouchableOpacity>

            {currentSeries > 1 && (
              <TouchableOpacity style={styles.editPreviousButton} onPress={handleEditPrevious}>
                <Text style={styles.editPreviousText}>ÖNCEKİ SERİYİ DÜZENLE</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
