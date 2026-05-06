import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveStudentSession } from '../services/api';

export interface TrainingHistory {
  id: string;
  date: string;
  totalSeries: number;
  arrowsPerSeries: number;
  totalScore: number;
  seriesScores: number[];
}

export const useScoreEntry = (initialSeries = 7, initialArrows = 5) => {
  // Antrenman Ayarları
  const [totalSeries, setTotalSeries] = useState(initialSeries);
  const [arrowsPerSeries, setArrowsPerSeries] = useState(initialArrows);
  
  // Skor Durumu
  const [currentSeries, setCurrentSeries] = useState(1);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [seriesScores, setSeriesScores] = useState<number[]>([]);
  
  const totalScore = seriesScores.reduce((acc, curr) => acc + curr, 0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Skor Artırma / Azaltma
  const handleIncrement = () => {
    const currentScore = parseInt(scoreInput || '0', 10);
    const maxScore = arrowsPerSeries * 3;
    if (currentScore < maxScore) {
      setScoreInput((currentScore + 1).toString());
    }
  };

  const handleDecrement = () => {
    const currentScore = parseInt(scoreInput || '0', 10);
    if (currentScore > 0) {
      setScoreInput((currentScore - 1).toString());
    }
  };

  const handleZero = () => {
    setScoreInput('0');
  };

  const handleScoreChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    const maxScore = arrowsPerSeries * 3;
    if (numericValue !== '') {
      const num = parseInt(numericValue, 10);
      if (num <= maxScore) {
        setScoreInput(num.toString());
      } else {
        setScoreInput(maxScore.toString());
      }
    } else {
      setScoreInput('');
    }
  };

  const handleSaveScore = () => {
    const currentScore = parseInt(scoreInput || '0', 10);
    
    setSeriesScores(prev => {
      const newScores = [...prev];
      newScores[currentSeries - 1] = currentScore;
      return newScores;
    });

    if (currentSeries < totalSeries) {
      const nextSeries = currentSeries + 1;
      setCurrentSeries(nextSeries);
      if (nextSeries <= seriesScores.length) {
        setScoreInput(seriesScores[nextSeries - 1]?.toString() || '');
      } else {
        setScoreInput('');
      }
    } else {
      setIsFinished(true);
      
      const saveToHistory = async () => {
        try {
          const finalScores = [...seriesScores];
          finalScores[currentSeries - 1] = currentScore;
          const finalTotal = finalScores.reduce((acc, curr) => acc + curr, 0);

          const now = new Date();
          const dateString = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

          const newHistory: TrainingHistory = {
            id: Date.now().toString(),
            date: dateString,
            totalSeries,
            arrowsPerSeries,
            totalScore: finalTotal,
            seriesScores: finalScores,
          };

          // 1. MONGODB'YE KAYDET
          try {
            const userDataStr = await AsyncStorage.getItem('@user_data');
            let userId = 'test_user_1';
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              userId = userData._id;
            }
            
            await saveStudentSession({
              userId: userId,
              date: dateString,
              totalScore: finalTotal,
              totalSeries,
              arrowsPerSeries,
              seriesScores: finalScores,
            });
            console.log("✅ MongoDB'ye başarıyla kaydedildi!");
          } catch (apiError) {
            console.error("❌ MongoDB'ye kaydedilemedi", apiError);
          }

          // 2. YEREL HAFIZAYA KAYDET
          const existingHistoryString = await AsyncStorage.getItem('@training_history');
          const existingHistory: TrainingHistory[] = existingHistoryString ? JSON.parse(existingHistoryString) : [];
          existingHistory.unshift(newHistory);
          await AsyncStorage.setItem('@training_history', JSON.stringify(existingHistory));
        } catch (e) {
          console.error("Geçmiş kaydedilemedi", e);
        }
      };

      saveToHistory();
    }
  };

  const handleEditPrevious = () => {
    if (isFinished) {
      setScoreInput(seriesScores[currentSeries - 1]?.toString() || '0');
      setIsFinished(false);
    } else if (currentSeries > 1) {
      const prevSeries = currentSeries - 1;
      setCurrentSeries(prevSeries);
      setScoreInput(seriesScores[prevSeries - 1]?.toString() || '0');
    }
  };

  const handleReset = () => {
    setTotalSeries(initialSeries);
    setArrowsPerSeries(initialArrows);
    setCurrentSeries(1);
    setScoreInput('');
    setSeriesScores([]);
    setIsFinished(false);
  };

  return {
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
    handleZero,
    handleScoreChange,
    handleSaveScore,
    handleEditPrevious,
    handleReset
  };
};
