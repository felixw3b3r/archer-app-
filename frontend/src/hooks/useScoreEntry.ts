import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newRecordId, queueRecord, syncRecords } from '../services/recordStore';

export interface TrainingHistory {
  id: string;
  _id?: string;
  clientId?: string;
  type?: string;
  pending?: boolean;
  date: string;
  totalSeries: number;
  arrowsPerSeries: number;
  totalScore: number;
  seriesScores: number[];
}

export const useScoreEntry = (initialSeries = 7, initialArrows = 5, persistTraining = true) => {
  const [totalSeries, updateTotalSeries] = useState(initialSeries);
  const [arrowsPerSeries, updateArrowsPerSeries] = useState(initialArrows);
  const [currentSeries, setCurrentSeries] = useState(1);
  const [scoreInput, setScoreInput] = useState('');
  const [seriesScores, setSeriesScores] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const recordId = useRef(newRecordId());
  const recordDate = useRef<Date | null>(null);
  const totalScore = seriesScores.reduce((sum, score) => sum + score, 0);

  // Settings remain editable until the first series has been saved.
  const setTotalSeries = (value: number) => {
    if (!seriesScores.length && !saving.current) updateTotalSeries(Math.min(1000, Math.max(1, value)));
  };
  const setArrowsPerSeries = (value: number) => {
    if (!seriesScores.length && !saving.current) {
      const arrows = Math.min(1000, Math.max(1, value));
      updateArrowsPerSeries(arrows);
      if (Number(scoreInput) > arrows * 3) setScoreInput(String(arrows * 3));
    }
  };
  const handleScoreChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    setScoreInput(numeric ? String(Math.min(Number(numeric), arrowsPerSeries * 3)) : '');
  };
  const handleIncrement = () => handleScoreChange(String(Number(scoreInput) + 1));
  const handleDecrement = () => handleScoreChange(String(Math.max(0, Number(scoreInput) - 1)));
  const handleZero = () => setScoreInput('0');

  const handleSaveScore = async () => {
    if (saving.current || isFinished) return;
    const scores = [...seriesScores];
    scores[currentSeries - 1] = Math.min(Number(scoreInput || 0), arrowsPerSeries * 3);
    if (currentSeries < totalSeries) {
      setSeriesScores(scores);
      setCurrentSeries(currentSeries + 1);
      setScoreInput(scores[currentSeries]?.toString() || '');
      return;
    }
    saving.current = true;
    setIsSaving(true);
    try {
      if (persistTraining) {
        const user = JSON.parse(await AsyncStorage.getItem('@user_data') || 'null');
        if (!user?._id) throw new Error('Kayıt için tekrar giriş yapın.');
        const now = recordDate.current || new Date();
        recordDate.current = now;
        await queueRecord('training', user._id, {
          id: recordId.current, clientId: recordId.current, userId: user._id,
          date: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
          createdAt: now.toISOString(), type: 'training', totalSeries, arrowsPerSeries,
          totalScore: scores.reduce((sum, score) => sum + score, 0), seriesScores: scores,
        });
        void syncRecords('training', user._id).catch(console.error);
      }
      setSeriesScores(scores);
      setIsFinished(true);
    } catch (error: any) {
      Alert.alert('Kayıt tamamlanamadı', error.message || 'Puanlarınız ekranda korunuyor. Lütfen tekrar deneyin.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };
  const handleEditPrevious = () => {
    if (saving.current) return;
    if (isFinished) {
      setScoreInput(String(seriesScores[currentSeries - 1] || 0));
      setIsFinished(false);
    } else if (currentSeries > 1) {
      setCurrentSeries(currentSeries - 1);
      setScoreInput(String(seriesScores[currentSeries - 2] || 0));
    }
  };
  const handleReset = () => {
    if (saving.current) return;
    updateTotalSeries(initialSeries);
    updateArrowsPerSeries(initialArrows);
    setCurrentSeries(1);
    setScoreInput('');
    setSeriesScores([]);
    setIsFinished(false);
    recordId.current = newRecordId();
    recordDate.current = null;
  };
  return { totalSeries, setTotalSeries, arrowsPerSeries, setArrowsPerSeries, currentSeries, scoreInput,
    seriesScores, totalScore, isFinished, isSaving, settingsLocked: seriesScores.length > 0 || isSaving,
    handleIncrement, handleDecrement, handleZero, handleScoreChange, handleSaveScore, handleEditPrevious, handleReset };
};
