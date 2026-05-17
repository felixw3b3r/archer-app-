import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { colors } from '../../theme/colors';
import { useScoreEntry } from '../../hooks/useScoreEntry';
import { getStyles } from '../student/ScoreEntryScreen.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CompetitionScoringProps {
  studentName: string;
  rounds: number;
  arrowsPerRound: number;
  onBack: () => void;
  onStatusChange?: (isFinished: boolean, totalScore: number, completedRounds: number, seriesScores: number[]) => void;
  theme: any;
  themeMode: 'dark' | 'light';
}

export default function CompetitionScoring({ 
  studentName, 
  rounds, 
  arrowsPerRound, 
  onBack, 
  onStatusChange,
  theme, 
  themeMode 
}: CompetitionScoringProps) {
  
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const {
    totalSeries,
    setTotalSeries,
    arrowsPerSeries,
    setArrowsPerSeries,
    currentSeries,
    scoreInput,
    seriesScores,
    totalScore,
    isFinished,
    handleIncrement,
    handleDecrement,
    handleScoreChange,
    handleSaveScore,
    handleEditPrevious,
    handleReset
  } = useScoreEntry(rounds, arrowsPerRound);

  const onStatusChangeRef = React.useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // KAYDET'e basıldığında puanı hemen hesaplayıp parent'a gönder
  const handleSaveAndNotify = () => {
    const currentScore = parseInt(scoreInput || '0', 10);
    const oldScore = seriesScores[currentSeries - 1] || 0;
    const newTotal = totalScore - oldScore + currentScore;
    const willFinish = currentSeries >= totalSeries;
    const updatedSeriesScores = [...seriesScores];
    updatedSeriesScores[currentSeries - 1] = currentScore;
    
    handleSaveScore();
    onStatusChangeRef.current?.(willFinish, newTotal, currentSeries, updatedSeriesScores);
  };

  if (isFinished) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <Text style={{ fontSize: 24, color: theme.text, marginBottom: 10 }}>{studentName}</Text>
         <Text style={{ fontSize: 32, color: theme.text, marginBottom: 20 }}>Yarışma Tamamlandı!</Text>
         <Text style={{ fontSize: 80, color: theme.primary, fontWeight: 'bold' }}>{totalScore}</Text>
         <Text style={{ fontSize: 22, color: theme.textSecondary, marginBottom: 50 }}>Toplam Puan</Text>
         
         <TouchableOpacity style={styles.editPreviousButton} onPress={handleEditPrevious}>
            <Text style={styles.editPreviousText}>DÜZENLE</Text>
         </TouchableOpacity>

          <TouchableOpacity style={[styles.saveButton, { marginTop: 20 }]} onPress={onBack}>
            <Text style={styles.saveButtonText}>LİSTEYE DÖN</Text>
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
          
          <View style={styles.header}>
            <TouchableOpacity style={styles.resetTopButton} onPress={onBack}>
              <Text style={styles.resetTopButtonText}>←</Text>
            </TouchableOpacity>
            
            <Text style={styles.title}>{studentName}</Text>

            <View style={{ width: 45 }} />

            <View style={styles.settingsRow}>
              <View style={styles.settingBox}>
                <Text style={styles.settingLabel}>Tur</Text>
                <Text style={styles.settingValue}>{totalSeries}</Text>
              </View>

              <View style={styles.settingBox}>
                <Text style={styles.settingLabel}>Ok/Tur</Text>
                <Text style={styles.settingValue}>{arrowsPerSeries}</Text>
              </View>
            </View>
          </View>

          <View style={styles.mainContent}>
            <Text style={styles.seriesInfo}>Tur {currentSeries} / {totalSeries}</Text>
            
            <View style={styles.scoreInputContainer}>
              <TouchableOpacity style={styles.scoreControlBtn} onPress={handleDecrement}>
                <Text style={styles.scoreControlText}>-</Text>
              </TouchableOpacity>

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

              <TouchableOpacity style={styles.scoreControlBtn} onPress={handleIncrement}>
                <Text style={styles.scoreControlText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndNotify}>
              <Text style={styles.saveButtonText}>KAYDET</Text>
            </TouchableOpacity>

            {currentSeries > 1 && (
              <TouchableOpacity style={styles.editPreviousButton} onPress={handleEditPrevious}>
                <Text style={styles.editPreviousText}>ÖNCEKİ TURU DÜZENLE</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
