import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { TrainingHistory } from '../../hooks/useScoreEntry';
import { getStyles } from './ScoreEntryScreen.styles';
import { getStudentSessions } from '../../services/api';

export default function HistoryScreen({ onOpenMenu, themeMode }: { onOpenMenu: () => void, themeMode: 'dark' | 'light' }) {
  const theme = themeMode === 'dark' ? colors.dark : colors.light;
  const styles = getStyles(theme);
  
  const [history, setHistory] = useState<TrainingHistory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchSessions = async (page: number, isInitial = false) => {
    try {
      if (!isInitial) setIsLoadingMore(true);

      const userDataStr = await AsyncStorage.getItem('@user_data');
      if (!userDataStr) return;
      const userData = JSON.parse(userDataStr);
      
      const data = await getStudentSessions(userData._id, page, 10);
      
      if (data && data.sessions) {
        if (isInitial) {
          setHistory(data.sessions);
          await AsyncStorage.setItem('@training_history', JSON.stringify(data.sessions));
        } else {
          setHistory(prev => [...prev, ...data.sessions]);
        }
        
        setHasMore(data.currentPage < data.totalPages);
        setCurrentPage(data.currentPage);
      }
    } catch (e) {
      console.log("Sunucu hatası, yerel veriler kullanılıyor.");
      if (isInitial) {
        const localData = await AsyncStorage.getItem('@training_history');
        if (localData) setHistory(JSON.parse(localData));
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Ekran her açıldığında verileri güncelle
  useEffect(() => {
    fetchSessions(1, true);
  }, []);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchSessions(currentPage + 1);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const renderItem = ({ item }: { item: TrainingHistory & { _id?: string } }) => {
    const itemId = item._id || item.id;
    const isExpanded = expandedId === itemId;
    // Ok başına ortalama puan
    const totalArrows = item.totalSeries * item.arrowsPerSeries;
    const averageScore = totalArrows > 0 ? (item.totalScore / totalArrows).toFixed(1) : '0';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleExpand(itemId)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={[styles.dateText, { color: theme.text }]}>{item.date}</Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>
              {item.totalSeries} Seri x {item.arrowsPerSeries} Ok
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.totalScoreText, { color: theme.primary }]}>{item.totalScore}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ortalama Puan / Ok</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{averageScore}</Text>
              </View>
            </View>
            
            <Text style={[styles.seriesTitle, { color: theme.text }]}>Seri Detayları:</Text>
            <View style={styles.seriesGrid}>
              {(item.seriesScores || []).map((score, index) => {
                const sessionAveragePerArrow = item.totalScore / (item.totalSeries * item.arrowsPerSeries);
                const roundAveragePerArrow = score / item.arrowsPerSeries;
                
                // Karşılaştırma için 1 ondalık basamağa yuvarlıyoruz
                const roundAvgFixed = parseFloat(roundAveragePerArrow.toFixed(1));
                const sessionAvgFixed = parseFloat(sessionAveragePerArrow.toFixed(1));

                let scoreColor = theme.textSecondary; // Default Gri
                
                if (roundAvgFixed > sessionAvgFixed) {
                  scoreColor = themeMode === 'dark' ? '#64FFDA' : '#4CAF50'; // Neon Yeşil : Normal Yeşil
                } else if (roundAvgFixed < sessionAvgFixed) {
                  scoreColor = themeMode === 'dark' ? '#FF3131' : '#FF5252'; // Neon Kırmızı : Normal Kırmızı
                }

                return (
                  <View key={index} style={[styles.seriesBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.seriesIndex, { color: theme.textSecondary }]}>{index + 1}. Seri</Text>
                    <Text style={[styles.seriesScore, { color: scoreColor }]}>{score}</Text>
                    <Text style={[styles.subText, { color: scoreColor, fontSize: 11, marginTop: 4, fontWeight: 'bold' }]}>
                      Ort: {roundAvgFixed.toFixed(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyTitle, { color: theme.primary }]}>Geçmiş</Text>
        <TouchableOpacity style={styles.historyMenuButton} onPress={onOpenMenu}>
          <Text style={[styles.historyMenuButtonText, { color: theme.text }]}>☰</Text>
        </TouchableOpacity>
      </View>
      
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Henüz kaydedilmiş antrenman yok.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item: any) => item._id || item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={() => (
            hasMore ? (
              <TouchableOpacity 
                style={{ padding: 20, marginBottom: 20 }} 
                onPress={loadMore}
                disabled={isLoadingMore}
              >
                <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: 'bold' }}>
                  {isLoadingMore ? 'Yükleniyor...' : 'DAHA FAZLA YÜKLE'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ padding: 20, marginBottom: 20 }}>
                <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 12 }}>Tüm kayıtlar yüklendi.</Text>
              </View>
            )
          )}
        />
      )}
    </View>
  );
}
