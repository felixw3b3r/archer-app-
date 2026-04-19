import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [scoreInput, setScoreInput] = useState<string>(''); // Boş başlasın veya "0"
  const [seriesScores, setSeriesScores] = useState<number[]>([]);
  
  // Toplam Puan otomatik olarak dizideki elemanların toplamıdır
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
    // Sadece sayı girilmesini sağla
    const numericValue = text.replace(/[^0-9]/g, '');
    
    // Maksimum puan kontrolü (örn 3 ok için 30)
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
    
    // Diziyi güncelle: Geçmiş bir turu düzenliyorsak o index'i değiştirir, yeni tursa ekler
    setSeriesScores(prev => {
      const newScores = [...prev];
      newScores[currentSeries - 1] = currentScore;
      return newScores;
    });

    // Sonraki seriye geç
    if (currentSeries < totalSeries) {
      const nextSeries = currentSeries + 1;
      setCurrentSeries(nextSeries);
      
      // Eğer sonraki seri için zaten bir puan girilmişse (geçmişten ileri geliyorsak) onu göster
      if (nextSeries <= seriesScores.length) {
        setScoreInput(seriesScores[nextSeries - 1]?.toString() || '');
      } else {
        setScoreInput(''); // Yepyeni bir seriyse kutuyu boşalt
      }
    } else {
      // Antrenman bittiğinde locale kaydet
      setIsFinished(true);
      
      const saveToHistory = async () => {
        try {
          // Toplam puanı (yeni eklenen skorla beraber) hesapla
          const finalScores = [...seriesScores];
          finalScores[currentSeries - 1] = currentScore;
          const finalTotal = finalScores.reduce((acc, curr) => acc + curr, 0);

          const now = new Date();
          // Saat:Dakika - Gün Ay Yıl formatı (Örn: 15:30 - 17 Nisan 2026)
          const dateString = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

          const newHistory: TrainingHistory = {
            id: Date.now().toString(),
            date: dateString,
            totalSeries,
            arrowsPerSeries,
            totalScore: finalTotal,
            seriesScores: finalScores,
          };

          const existingHistoryString = await AsyncStorage.getItem('@training_history');
          const existingHistory: TrainingHistory[] = existingHistoryString ? JSON.parse(existingHistoryString) : [];
          
          existingHistory.unshift(newHistory); // En yeni antrenmanı başa ekle
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
      // Bitiş ekranından dönüyorsak, son girdiğimiz seri currentSeries'in kendisidir.
      // Seriyi azaltmadan direkt mevcut seriyi (son seriyi) düzenlemeye açarız.
      setScoreInput(seriesScores[currentSeries - 1]?.toString() || '0');
      setIsFinished(false);
    } else if (currentSeries > 1) {
      // Normal bir şekilde geri gidiyorsak seriyi 1 azalt
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
