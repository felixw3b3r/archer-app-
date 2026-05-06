import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Modal, 
  TextInput,
  Alert,
  StyleSheet 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { styles } from './TeacherDashboard.styles';
import CompetitionScoring from './CompetitionScoring';
import { 
  getTeacherStudents, 
  addTeacherStudent, 
  getTeacherCompetitions, 
  saveTeacherCompetition 
} from '../../services/api';

interface Student {
  id: string;
  name: string;
  age: string;
}

interface TeacherDashboardProps {
  onOpenMenu: () => void;
  themeMode: 'dark' | 'light';
  theme: any;
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onOpenMenu, themeMode, theme, onLogout }) => {
  const [view, setView] = useState<'overview' | 'list' | 'competition_setup' | 'competition_active' | 'competition_history'>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');

  // Yarışma Ayarları
  const [compRounds, setCompRounds] = useState('5');
  const [compArrows, setCompArrows] = useState('7');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [finishedStudentIds, setFinishedStudentIds] = useState<string[]>([]);
  const [studentTotalScores, setStudentTotalScores] = useState<{[key: string]: number}>({});
  const [studentCompletedRounds, setStudentCompletedRounds] = useState<{[key: string]: number}>({});
  const [studentSeriesScores, setStudentSeriesScores] = useState<{[key: string]: number[]}>({});
  const [missedStudentIds, setMissedStudentIds] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [competitionHistory, setCompetitionHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);
  const [compStartTime, setCompStartTime] = useState<number | null>(null);
  const [studentDurations, setStudentDurations] = useState<{[key: string]: number}>({});
  const [activeSessionStartTime, setActiveSessionStartTime] = useState<number | null>(null);

  // Geçmişi ve Öğrencileri Yükle
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1. Yarışma Geçmişini Çek
        try {
          const dbHistory = await getTeacherCompetitions('test_teacher_1');
          if (dbHistory && dbHistory.length > 0) {
            setCompetitionHistory(dbHistory);
            await AsyncStorage.setItem('@competition_history', JSON.stringify(dbHistory));
          } else {
            const historyData = await AsyncStorage.getItem('@competition_history');
            if (historyData) setCompetitionHistory(JSON.parse(historyData));
          }
        } catch (apiErr) {
          console.log("Yarışma geçmişi sunucudan alınamadı, lokale bakılıyor.");
          const historyData = await AsyncStorage.getItem('@competition_history');
          if (historyData) setCompetitionHistory(JSON.parse(historyData));
        }
        
        // 2. Öğrenci Listesini Çek
        try {
          const dbStudents = await getTeacherStudents('test_teacher_1');
          if (dbStudents && dbStudents.length > 0) {
            const mapped = dbStudents.map((s: any) => ({
              id: s._id,
              name: s.name,
              age: s.age.toString()
            }));
            setStudents(mapped);
          } else {
            const studentsData = await AsyncStorage.getItem('@students_list');
            if (studentsData) setStudents(JSON.parse(studentsData));
          }
        } catch (apiError) {
          console.log("Öğrenci listesi sunucudan alınamadı, lokale bakılıyor.");
          const studentsData = await AsyncStorage.getItem('@students_list');
          if (studentsData) setStudents(JSON.parse(studentsData));
        }
      } catch (e) {
        console.error("Veriler yüklenemedi", e);
      }
    };
    loadInitialData();
  }, []);

  const saveCompetitionToHistory = async () => {
    try {
      const compEndTime = Date.now();
      const totalCompDuration = compStartTime ? Math.floor((compEndTime - compStartTime) / 1000) : 0;

      const safeCompRounds = parseInt(compRounds) || 5;
      const safeCompArrows = parseInt(compArrows) || 7;
    
      const sortedResults = students
        .filter(s => selectedStudentIds.includes(s.id))
        .sort((a, b) => (studentTotalScores[b.id] || 0) - (studentTotalScores[a.id] || 0))
        .map(s => {
          const score = studentTotalScores[s.id] || 0;
          const totalArrows = safeCompRounds * safeCompArrows;
          const duration = studentDurations[s.id] || 0;
          return {
            studentName: s.name,
            totalScore: score,
            seriesScores: studentSeriesScores[s.id] || [],
            average: totalArrows > 0 ? (score / totalArrows).toFixed(2) : "0.00",
            duration: `${Math.floor(duration / 60)}dk ${duration % 60}sn`
          };
        });

      const now = new Date();
      const newRecord = {
        teacherId: 'test_teacher_1', // Backend için gerekli
        date: now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        rounds: safeCompRounds.toString(),
        arrowsPerRound: safeCompArrows.toString(),
        totalDuration: `${Math.floor(totalCompDuration / 60)}dk ${totalCompDuration % 60}sn`,
        results: sortedResults
      };

      // 1. Sunucuya Kaydet ve Yanıtı Al
      let recordToDisplay = newRecord;
      try {
        const savedRecord = await saveTeacherCompetition(newRecord);
        if (savedRecord && savedRecord._id) {
          recordToDisplay = savedRecord;
        }
        console.log("✅ Yarışma sunucuya başarıyla kaydedildi!");
      } catch (apiErr) {
        console.error("❌ Yarışma sunucuya kaydedilemedi", apiErr);
      }

      const safeHistory = Array.isArray(competitionHistory) ? competitionHistory : [];
      const updatedHistory = [recordToDisplay, ...safeHistory];
      setCompetitionHistory(updatedHistory);
      await AsyncStorage.setItem('@competition_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Yarışma kaydedilemedi", e);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleAddStudent = () => {
    const trimmedName = newName.trim();
    const ageNum = parseInt(newAge, 10);

    if (!trimmedName || !newAge.trim()) {
      Alert.alert("Hata", "İsim ve Yaş alanları zorunludur!");
      return;
    }

    if (trimmedName.length < 3) {
      Alert.alert("Hata", "Öğrenci ismi en az 3 karakter olmalıdır!");
      return;
    }

    const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
    if (!nameRegex.test(trimmedName)) {
      Alert.alert("Hata", "İsim sadece harf ve boşluk içerebilir, sayı veya özel karakter kullanılamaz!");
      return;
    }

    if (isNaN(ageNum) || ageNum < 9 || ageNum > 29) {
      Alert.alert("Hata", "Yaş sınırı 9 - 29 arası olmalıdır!");
      return;
    }

    const addStudentToDB = async () => {
      try {
        const savedStudent = await addTeacherStudent({
          teacherId: 'test_teacher_1',
          name: trimmedName,
          age: ageNum
        });
        
        const newStudent: Student = {
          id: savedStudent._id,
          name: savedStudent.name,
          age: savedStudent.age.toString(),
        };

        const updatedStudents = [newStudent, ...students];
        setStudents(updatedStudents);
        // Yedek olarak yine de lokale kaydet
        await AsyncStorage.setItem('@students_list', JSON.stringify(updatedStudents));
        
      } catch (err) {
        console.error("Öğrenci veritabanına eklenemedi", err);
        // Fallback
        const newStudent: Student = {
          id: Date.now().toString(),
          name: trimmedName,
          age: newAge,
        };
        const updatedStudents = [newStudent, ...students];
        setStudents(updatedStudents);
        await AsyncStorage.setItem('@students_list', JSON.stringify(updatedStudents));
      }
      
      setNewName('');
      setNewAge('');
      setIsModalVisible(false);
    };

    addStudentToDB();
  };

  // ÖĞRENCİ LİSTESİ GÖRÜNÜMÜ
  if (view === 'list') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => setView('overview')} style={styles.backButtonHeader}>
            <Text style={{ fontSize: 24, color: theme.primary }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Öğrenciler</Text>
          <TouchableOpacity onPress={() => setIsModalVisible(true)} style={styles.addButton}>
            <Text style={{ fontSize: 32, color: theme.primary }}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {students.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Henüz öğrenci eklenmemiş.</Text>
            </View>
          ) : (
            students.map((student) => (
              <View key={student.id} style={[styles.studentCard, { backgroundColor: theme.surface }]}>
                <View style={styles.ppArea}>
                  <Text style={{ fontSize: 40 }}>👤</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: theme.text }]}>{student.name.toUpperCase()}</Text>
                  <Text style={[styles.studentAge, { color: theme.textSecondary }]}>{student.age} Yaşında</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Modal visible={isModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>Yeni Öğrenci</Text>
              
              <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
                placeholder="Ad Soyad"
                placeholderTextColor={theme.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />

              <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
                placeholder="Yaş"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={newAge}
                onChangeText={setNewAge}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.cancelButton}>
                  <Text style={{ color: theme.textSecondary }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddStudent} style={[styles.saveButton, { backgroundColor: theme.primary }]}>
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>EKLE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // YARIŞMA KURULUM EKRANI
  if (view === 'competition_setup') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => setView('overview')} style={styles.backButtonHeader}>
            <Text style={{ fontSize: 24, color: theme.primary }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Yarışma Kurulumu</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.setupCard}>
            <Text style={[styles.setupLabel, { color: theme.text }]}>Tur Sayısı:</Text>
            <TextInput 
              style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
              keyboardType="numeric"
              value={compRounds}
              onChangeText={setCompRounds}
            />
            <Text style={[styles.setupLabel, { color: theme.text }]}>Tur Başına Ok Sayısı:</Text>
            <TextInput 
              style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
              keyboardType="numeric"
              value={compArrows}
              onChangeText={setCompArrows}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Öğrenci Seçin:</Text>
          {students.map((student) => {
            const isSelected = selectedStudentIds.includes(student.id);
            return (
              <TouchableOpacity 
                key={student.id} 
                style={[
                  styles.studentSelectionRow, 
                  { backgroundColor: isSelected ? theme.primary + '20' : theme.surface, borderColor: isSelected ? theme.primary : theme.border }
                ]}
                onPress={() => toggleStudentSelection(student.id)}
              >
                <Text style={[styles.studentNameSmall, { color: theme.text }]}>{student.name}</Text>
                <View style={[styles.plusButton, { backgroundColor: isSelected ? theme.primary : theme.border }]}>
                  <Text style={{ color: isSelected ? '#000' : theme.textSecondary, fontWeight: 'bold' }}>{isSelected ? '✓' : '+'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity 
            style={[styles.startCompButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (selectedStudentIds.length === 0) {
                Alert.alert("Hata", "Lütfen en az bir öğrenci seçin!");
                return;
              }
              setCompStartTime(Date.now());
              setView('competition_active');
            }}
          >
            <Text style={styles.startCompButtonText}>YARIŞMAYI BAŞLAT</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // AKTİF YARIŞMA EKRANI
  if (view === 'competition_active') {
    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* ÖĞRENCİ LİSTESİ (SADECE HİÇBİR ÖĞRENCİ SEÇİLİ DEĞİLSE VE SONUÇLAR GÖSTERİLMİYORSA GÖRÜNÜR) */}
        {!activeStudentId && !showResults && (
          <View style={{ flex: 1 }}>
            <View style={[styles.header, { backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={() => setView('competition_setup')} style={styles.backButtonHeader}>
                <Text style={{ fontSize: 24, color: theme.primary }}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.primary }]}>Yarışma Alanı</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
              {selectedStudents.map((student) => {
                const isFinished = finishedStudentIds.includes(student.id);
                const isMissed = missedStudentIds.includes(student.id);
                
                let bgColor = theme.surface;
                if (isFinished) {
                  bgColor = themeMode === 'dark' ? '#1B4D3E' : '#E8F5E9';
                } else if (isMissed) {
                  bgColor = themeMode === 'dark' ? '#4B0082' : '#FFEBEE'; // Violet : Reddish
                }

                return (
                  <TouchableOpacity 
                    key={student.id} 
                    style={[
                      styles.studentCard, 
                      { backgroundColor: bgColor, borderColor: isMissed ? (themeMode === 'dark' ? '#8A2BE2' : '#F44336') : theme.border, borderWidth: isMissed ? 2 : 1 }
                    ]}
                    onPress={() => {
                      setActiveStudentId(student.id);
                      setActiveSessionStartTime(Date.now());
                      setMissedStudentIds(prev => prev.filter(id => id !== student.id));
                    }}
                  >
                    <View style={[styles.ppArea, { borderWidth: isFinished ? 1.5 : 0 }, isFinished && { borderColor: '#4CAF50' }, { position: 'relative' }]}>
                      {!isFinished && (
                        <Svg width={90} height={90} style={{ position: 'absolute', top: 0, left: 0 }}>
                          {Array.from({ length: parseInt(compRounds) || 1 }).map((_, i) => {
                            const total = parseInt(compRounds) || 1;
                            const comp = studentCompletedRounds[student.id] || 0;
                            const isActive = i < comp;
                            const radius = 42;
                            const circum = 2 * Math.PI * radius;
                            const gap = circum * 0.08;
                            const segLen = (circum / total) - gap;
                            const rotation = (i * 360) / total - 90;
                            return (
                              <Circle
                                key={i}
                                cx={45}
                                cy={45}
                                r={radius}
                                stroke={isActive ? theme.primary : theme.textSecondary + '40'}
                                strokeWidth={4}
                                strokeDasharray={`${segLen} ${circum}`}
                                strokeDashoffset={0}
                                rotation={rotation}
                                origin="45, 45"
                                fill="none"
                                strokeLinecap="round"
                              />
                            );
                          })}
                        </Svg>
                      )}
                      <Text style={{ fontSize: 40 }}>{isFinished ? '✅' : (isMissed ? '⚠️' : '👤')}</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: theme.text }]}>{student.name.toUpperCase()}</Text>
                      <Text style={[styles.studentAge, { color: isMissed ? (themeMode === 'dark' ? '#E0B0FF' : '#D32F2F') : theme.textSecondary }]}>
                        {isFinished ? 'Atışlar Tamamlandı' : (isMissed ? 'PUAN GİRİLMEMİŞ!' : 'Puan Girisi Icin Tikla')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity 
                style={[styles.finishCompButton, { backgroundColor: theme.danger || '#FF3131' }]}
                onPress={() => {
                  const unfinished = selectedStudentIds.filter(id => !finishedStudentIds.includes(id));
                  
                  // Debug: Puanların durumunu göster
                  if (Object.keys(studentTotalScores).length === 0) {
                    Alert.alert("HATA", "Sisteme hiçbir puan kaydedilmemiş görünüyor! Lütfen öğrencilerin içine girip KAYDET butonuna bastığınızdan emin olun.");
                    return;
                  }

                  if (unfinished.length > 0) {
                    setMissedStudentIds(unfinished);
                    Alert.alert("Eksik Puanlar", "Puanı girilmemiş öğrenciler var! Yine de bitirmek istiyor musunuz?", [
                      { text: "Düzenle", style: "cancel" },
                      { text: "Yarışmayı Bitir", onPress: () => { setShowResults(true); saveCompetitionToHistory(); } }
                    ]);
                  } else {
                    setShowResults(true);
                    saveCompetitionToHistory();
                  }
                }}
              >
                <Text style={styles.finishCompButtonText}>YARIŞMAYI BİTİR</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* SONUÇ EKRANI */}
        {showResults && !activeStudentId && (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, backgroundColor: theme.background }}>
               <View style={[styles.header, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.headerTitle, { color: theme.primary }]}>Yarışma Sonuçları</Text>
                  <TouchableOpacity onPress={() => { setShowResults(false); setView('overview'); setSelectedStudentIds([]); setFinishedStudentIds([]); setStudentTotalScores({}); setStudentCompletedRounds({}); setStudentSeriesScores({}); }} style={styles.menuButton}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold' }}>KAPAT</Text>
                  </TouchableOpacity>
               </View>

               <ScrollView contentContainerStyle={styles.listContainer}>
                  {selectedStudents
                    .sort((a, b) => (studentTotalScores[b.id] || 0) - (studentTotalScores[a.id] || 0))
                    .map((student, index) => {
                      const score = studentTotalScores[student.id] || 0;
                      const totalArrows = parseInt(compRounds) * parseInt(compArrows);
                      const avg = totalArrows > 0 ? (score / totalArrows).toFixed(2) : "0.00";
                      const duration = studentDurations[student.id] || 0;
                      
                      return (
                        <View key={student.id} style={[styles.resultCard, { backgroundColor: theme.surface }]}>
                          <View style={styles.resultLeft}>
                             <View style={[styles.resultPpArea, { position: 'relative' }]}>
                               <Text style={{ fontSize: 24 }}>👤</Text>
                               <View style={{ 
                                 position: 'absolute', 
                                 bottom: -5, 
                                 right: -5, 
                                 backgroundColor: theme.accent, 
                                 borderRadius: 10, 
                                 width: 20, 
                                 height: 20, 
                                 justifyContent: 'center', 
                                 alignItems: 'center' 
                               }}>
                                 <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                               </View>
                             </View>
                          </View>

                          <View style={styles.resultInfo}>
                            <Text style={[styles.studentName, { color: theme.text, fontSize: 18 }]}>{student.name.toUpperCase()}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                               <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Ort: {avg} | </Text>
                               <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Süre: {Math.floor(duration / 60)}dk {duration % 60}sn</Text>
                            </View>
                          </View>

                          <View style={styles.resultScoreContainer}>
                            <Text style={[styles.resultScore, { color: theme.primary }]}>{score}</Text>
                          </View>
                        </View>
                      );
                    })}
               </ScrollView>
            </View>
          </View>
        )}

        {/* HER ÖĞRENCİ İÇİN AYRI BİR SCORING COMPONENT (DURUM KORUMASI İÇİN) */}
        {!showResults && selectedStudents.map(student => (
          <View 
            key={student.id} 
            style={{ 
              display: activeStudentId === student.id ? 'flex' : 'none', 
              flex: 1 
            }}
          >
            <CompetitionScoring 
              studentName={student.name}
              rounds={parseInt(compRounds)}
              arrowsPerRound={parseInt(compArrows)}
              onBack={() => {
                if (activeSessionStartTime) {
                  const sessionDuration = Math.floor((Date.now() - activeSessionStartTime) / 1000);
                  setStudentDurations(prev => ({
                    ...prev,
                    [student.id]: (prev[student.id] || 0) + sessionDuration
                  }));
                  setActiveSessionStartTime(null);
                }
                setActiveStudentId(null);
              }}
              onStatusChange={(finished, totalScore, completedRounds, seriesScores) => {
                setStudentTotalScores(prev => ({ ...prev, [student.id]: totalScore }));
                setStudentCompletedRounds(prev => ({ ...prev, [student.id]: completedRounds }));
                setStudentSeriesScores(prev => ({ ...prev, [student.id]: seriesScores }));
                if (finished) {
                  setFinishedStudentIds(prev => prev.includes(student.id) ? prev : [...prev, student.id]);
                } else {
                  setFinishedStudentIds(prev => prev.filter(id => id !== student.id));
                }
              }}
              theme={theme}
              themeMode={themeMode}
            />
          </View>
        ))}
      </View>
    );
  }

  // YARIŞMA GEÇMİŞİ EKRANI
  if (view === 'competition_history') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => { setSelectedHistoryItem(null); setView('overview'); }} style={styles.backButtonHeader}>
            <Text style={{ fontSize: 24, color: theme.primary }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Yarışma Geçmişi</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {competitionHistory.length === 0 ? (
             <View style={styles.emptyContainer}>
               <Text style={{ color: theme.textSecondary }}>Henüz kayıtlı yarışma yok.</Text>
             </View>
          ) : (
            competitionHistory.map((item: any) => {
              const itemId = item._id || item.id;
              return (
                <TouchableOpacity 
                  key={itemId} 
                  style={[styles.historyCard, { backgroundColor: theme.surface }]}
                  onPress={() => setSelectedHistoryItem(item)}
                >
                  <View>
                    <Text style={[styles.historyDate, { color: theme.text }]}>{item.date}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.rounds} Tur x {item.arrowsPerRound} Ok | Toplam Süre: {item.totalDuration}</Text>
                  </View>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Detay →</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {selectedHistoryItem && (
          <Modal visible={true} animationType="slide">
             <View style={{ flex: 1, backgroundColor: theme.background }}>
                <View style={[styles.header, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.headerTitle, { color: theme.primary }]}>Sıralama</Text>
                  <TouchableOpacity onPress={() => setSelectedHistoryItem(null)} style={styles.menuButton}>
                    <Text style={{ color: theme.primary }}>KAPAT</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.listContainer}>
                  {selectedHistoryItem.results.map((res: any, index: number) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.resultCard, { backgroundColor: theme.surface }]}
                      onPress={() => setSelectedStudentDetail(res)}
                    >
                      <View style={styles.resultLeft}>
                        <View style={[styles.resultPpArea, { position: 'relative' }]}>
                          <Text style={{ fontSize: 24 }}>👤</Text>
                          <View style={{ position: 'absolute', bottom: -5, right: -5, backgroundColor: theme.accent, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.studentName, { color: theme.text, fontSize: 18 }]}>{res.studentName.toUpperCase()}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Ort: {res.average} | Süre: {res.duration}</Text>
                      </View>
                      <View style={styles.resultScoreContainer}>
                        <Text style={[styles.resultScore, { color: theme.primary }]}>{res.totalScore}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
             </View>
          </Modal>
        )}

        {selectedStudentDetail && (
          <Modal visible={true} animationType="slide">
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              <View style={[styles.header, { backgroundColor: theme.surface }]}>
                <TouchableOpacity onPress={() => setSelectedStudentDetail(null)} style={styles.backButtonHeader}>
                  <Text style={{ fontSize: 24, color: theme.primary }}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.primary }]}>{selectedStudentDetail.studentName}</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView contentContainerStyle={styles.listContainer}>
                <View style={[styles.infoCard, { backgroundColor: theme.surface, marginBottom: 15 }]}>
                  <View>
                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Genel Ortalama (Ok Başına)</Text>
                    <Text style={{ color: theme.primary, fontSize: 32, fontWeight: 'bold' }}>{selectedStudentDetail.average}</Text>
                  </View>
                </View>

                {(!selectedStudentDetail.seriesScores || selectedStudentDetail.seriesScores.length === 0) ? (
                  <View style={[styles.emptyContainer, { marginTop: 50 }]}>
                    <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>Bu eski kayıt için detaylı tur verisi bulunamadı.</Text>
                  </View>
                ) : (
                  selectedStudentDetail.seriesScores.map((score: number, idx: number) => {
                    const arrowsPerRound = parseInt(selectedHistoryItem.arrowsPerRound);
                    const roundAvg = (score / arrowsPerRound).toFixed(2);
                    const overallAvg = parseFloat(selectedStudentDetail.average);
                    const currentRoundAvg = parseFloat(roundAvg);

                    let avgColor = theme.text;
                    if (currentRoundAvg > overallAvg) avgColor = '#4CAF50';
                    else if (currentRoundAvg < overallAvg) avgColor = '#FF3131';

                    return (
                      <View key={idx} style={[styles.historyCard, { backgroundColor: theme.surface, marginBottom: 8, paddingVertical: 15 }]}>
                        <View>
                          <Text style={[styles.historyDate, { color: theme.text }]}>{idx + 1}. Tur</Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{arrowsPerRound} Ok Atıldı</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: theme.primary, fontSize: 20, fontWeight: 'bold' }}>{score} Puan</Text>
                          <Text style={{ color: avgColor, fontSize: 12, fontWeight: '600' }}>Ort: {roundAvg}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Öğretmen Paneli</Text>
        <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton}>
          <Text style={{ fontSize: 24, color: theme.text }}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Image 
            source={require('../../../assets/teacher_role.png')} 
            style={styles.profileImage} 
          />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.welcomeText, { color: theme.text }]}>Hoş Geldiniz, Hocam</Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>Öğrenci listenizi buradan yönetebilirsiniz.</Text>
          </View>
        </View>

        <View style={styles.featuresList}>
          <TouchableOpacity 
            style={[styles.featureItem, { backgroundColor: theme.surface }]}
            onPress={() => setView('list')}
          >
            <Text style={styles.featureIcon}>👥</Text>
            <View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Öğrenci Listesi</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.featureItem, { backgroundColor: theme.surface }]}
            onPress={() => setView('competition_setup')}
          >
            <Text style={styles.featureIcon}>🎯</Text>
            <View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Yarışma Başlat</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.featureItem, { backgroundColor: theme.surface }]}
            onPress={() => setView('competition_history')}
          >
            <Text style={styles.featureIcon}>📜</Text>
            <View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Yarışma Geçmişi</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: '#FF3131' }]} 
          onPress={onLogout}
        >
          <Text style={{ color: '#FF3131', fontWeight: 'bold' }}>Çıkış Yap / Rol Seçimi</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default TeacherDashboard;
