import React, { useState, useEffect, useRef } from 'react';
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
import { getStyles } from './TeacherDashboard.styles';
import CompetitionScoring from './CompetitionScoring';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTeacherCompetitions, createStudentActivation } from '../../services/api';
import { newRecordId, queueRecord, readRecords, mergeRecords, syncRecords } from '../../services/recordStore';

interface Student {
  id: string;
  name: string;
  surname: string;
  dob: string;
  needsActivation?: boolean;
}

interface TeacherDashboardProps {
  onOpenMenu: () => void;
  themeMode: 'dark' | 'light';
  theme: any;
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onOpenMenu, themeMode, theme, onLogout }) => {
  const insets = useSafeAreaInsets();
  const styles = getStyles(insets);

  const competitionId = useRef(newRecordId());
  const savingCompetition = useRef(false);
  const [isSavingCompetition, setIsSavingCompetition] = useState(false);
  const [view, setView] = useState<'overview' | 'list' | 'competition_setup' | 'competition_active' | 'competition_history' | 'student_detail'>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [hasMoreStudents, setHasMoreStudents] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSurname, setNewSurname] = useState('');
  const [newDob, setNewDob] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
  const [isLoadingCompHistory, setIsLoadingCompHistory] = useState(false);

  const loadCompetitions = async () => {
    setIsLoadingCompHistory(true);
    try {
      const user = JSON.parse(await AsyncStorage.getItem('@user_data') || 'null');
      if (!user?._id) return;
      setCompetitionHistory(await readRecords('competition', user._id));
      await syncRecords('competition', user._id);
      const records = await getTeacherCompetitions(user._id);
      setCompetitionHistory(await mergeRecords('competition', user._id, records));
    } catch (error) {
      console.error('Yarışma geçmişi yüklenemedi', error);
    } finally { setIsLoadingCompHistory(false); }
  };

  useEffect(() => {
    void loadCompetitions();
    void fetchStudents(1, true);
  }, []);

  // Görünüm değiştiğinde yarışma geçmişini tazele
  useEffect(() => {
    if (view === 'competition_history') {
      loadCompetitions();
    }
  }, [view]);

  const fetchStudents = async (page: number, isInitial = false) => {
    try {
      if (!isInitial) setIsLoadingMore(true);
      const { getAllStudents } = require('../../services/api');
      const data = await getAllStudents(page, 10);
      
      if (data && data.students) {
        const mapped = data.students.map((s: any) => ({
          id: s._id,
          name: s.name,
          surname: s.surname,
          dob: s.dob,
          needsActivation: s.needsActivation
        }));
        
        if (isInitial) {
          setStudents(mapped);
        } else {
          setStudents(prev => [...prev, ...mapped]);
        }
        
        setHasMoreStudents(data.currentPage < data.totalPages);
        setStudentPage(data.currentPage);
      }
    } catch (apiError) {
      console.log("Öğrenci listesi alınamadı");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMoreStudents = () => {
    if (!isLoadingMore && hasMoreStudents) {
      fetchStudents(studentPage + 1);
    }
  };

  const saveCompetitionToHistory = async () => {
    if (savingCompetition.current) return;
    savingCompetition.current = true;
    setIsSavingCompetition(true);
    try {
      const user = JSON.parse(await AsyncStorage.getItem('@user_data') || 'null');
      if (!user?._id) throw new Error('Lütfen tekrar giriş yapın.');
      const rounds = Number(compRounds);
      const arrows = Number(compArrows);
      const duration = compStartTime ? Math.floor((Date.now() - compStartTime) / 1000) : 0;
      const results = students.filter(s => selectedStudentIds.includes(s.id))
        .sort((a, b) => (studentTotalScores[b.id] || 0) - (studentTotalScores[a.id] || 0))
        .map(student => {
          const score = studentTotalScores[student.id] || 0;
          const seconds = studentDurations[student.id] || 0;
          return {
            studentId: student.id, studentName: student.name + ' ' + student.surname,
            totalScore: score, seriesScores: studentSeriesScores[student.id] || [],
            average: (score / (rounds * arrows)).toFixed(2),
            duration: Math.floor(seconds / 60) + 'dk ' + seconds % 60 + 'sn'
          };
        });
      const now = new Date();
      await queueRecord('competition', user._id, {
        id: competitionId.current, clientId: competitionId.current, teacherId: user._id,
        date: now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(), rounds: String(rounds), arrowsPerRound: String(arrows),
        totalDuration: Math.floor(duration / 60) + 'dk ' + duration % 60 + 'sn', results,
      });
      setCompetitionHistory(await readRecords('competition', user._id));
      setShowResults(true);
      void syncRecords('competition', user._id).catch(console.error);
    } catch (error: any) {
      Alert.alert('Kayıt tamamlanamadı', error.message || 'Puanlar korunuyor. Lütfen tekrar deneyin.');
    } finally {
      savingCompetition.current = false;
      setIsSavingCompetition(false);
    }
  };

  const issueActivation = async (student: Student) => {
    try {
      const result = await createStudentActivation(student.id);
      Alert.alert('İlk giriş kodu', student.name + ' ' + student.surname + '\n\n' + result.activationCode + '\n\nKod 7 gün geçerlidir. Öğrenci bu kodla kendi şifresini belirleyebilir.');
    } catch (error: any) { Alert.alert('Hata', error.message); }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  // Doğum tarihinden yaş hesaplayan yardımcı fonksiyon
  const calculateAge = (dobString: string) => {
    try {
      const [day, month, year] = dobString.split('/').map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return "??";
    }
  };

  const handleInspectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setView('student_detail');
    setIsLoadingHistory(true);
    try {
      const { getStudentSessions } = require('../../services/api');
      const data = await getStudentSessions(student.id, 1, 50); // İnceleme ekranında ilk 50 kaydı çekelim
      setStudentHistory(data.sessions || []);
    } catch (err) {
      console.error("Öğrenci geçmişi alınamadı", err);
      Alert.alert("Hata", "Öğrenci geçmişi yüklenemedi.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAddStudent = async () => {
    const trimmedName = newName.trim();
    const trimmedSurname = newSurname.trim();

    if (!trimmedName || !trimmedSurname || !newDob.trim()) {
      Alert.alert("Hata", "Tüm alanlar zorunludur!");
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(newDob)) {
      Alert.alert("Hata", "Doğum tarihi GG/AA/YYYY formatında olmalıdır!");
      return;
    }

    try {
      setIsLoading(true);
      const { addStudentByTeacher } = require('../../services/api');
      const savedStudent = await addStudentByTeacher({
        name: trimmedName,
        surname: trimmedSurname,
        dob: newDob
      });
      
      const newStudent: Student = {
        id: savedStudent._id,
        name: savedStudent.name,
        surname: savedStudent.surname,
        dob: savedStudent.dob,
        needsActivation: savedStudent.needsActivation
      };

      setStudents(prev => [newStudent, ...prev]);
      setNewName('');
      setNewSurname('');
      setNewDob('');
      setIsModalVisible(false);
      Alert.alert("Öğrenci kaydedildi", "İlk giriş kodu: " + savedStudent.activationCode + "\nKod 7 gün geçerlidir. Öğrenci bu kod ve seçeceği şifreyle giriş yapabilir.");
    } catch (err: any) {
      Alert.alert("Hata", err.message);
    } finally {
      setIsLoading(false);
    }
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
                  <Text style={[styles.studentName, { color: theme.text }]}>
                    {student.name.toUpperCase()} {student.surname.toUpperCase()}
                  </Text>
                  <Text style={[styles.studentAge, { color: theme.textSecondary }]}>
                    {calculateAge(student.dob)} Yaşında ({student.dob})
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.inspectButton, { backgroundColor: theme.primary + '30' }]}
                  onPress={() => handleInspectStudent(student)}
                >
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>İNCELE</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          
          {hasMoreStudents && students.length > 0 && (
            <TouchableOpacity 
              style={[styles.loadMoreButton, { marginTop: 20, marginBottom: 40 }]} 
              onPress={loadMoreStudents}
              disabled={isLoadingMore}
            >
              <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: 'bold' }}>
                {isLoadingMore ? 'Yükleniyor...' : 'DAHA FAZLA YÜKLE'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal visible={isModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>Yeni Öğrenci</Text>
              
              <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
                placeholder="Ad"
                placeholderTextColor={theme.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />

              <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
                placeholder="Soyad"
                placeholderTextColor={theme.textSecondary}
                value={newSurname}
                onChangeText={setNewSurname}
              />

              <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
                placeholder="Doğum Tarihi (GG/AA/YYYY)"
                placeholderTextColor={theme.textSecondary}
                value={newDob}
                maxLength={10}
                onChangeText={(text) => {
                  // Otomatik slash ekleme
                  if (text.length === 2 && newDob.length === 1) text += '/';
                  if (text.length === 5 && newDob.length === 4) text += '/';
                  setNewDob(text);
                }}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.cancelButton}>
                  <Text style={{ color: theme.textSecondary }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleAddStudent} 
                  style={[styles.saveButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 }]}
                  disabled={isLoading}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>{isLoading ? '...' : 'KAYDET'}</Text>
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
                <Text style={[styles.studentNameSmall, { color: theme.text }]}>
                  {student.name} {student.surname}
                </Text>
                <View style={[styles.plusButton, { backgroundColor: isSelected ? theme.primary : theme.border }]}>
                  <Text style={{ color: isSelected ? '#000' : theme.textSecondary, fontWeight: 'bold' }}>{isSelected ? '✓' : '+'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {hasMoreStudents && (
            <TouchableOpacity onPress={loadMoreStudents} disabled={isLoadingMore} style={{ padding: 20 }}>
              <Text style={{ color: theme.primary, textAlign: 'center' }}>{isLoadingMore ? 'Yükleniyor...' : 'DAHA FAZLA ÖĞRENCİ'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.startCompButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (selectedStudentIds.length === 0) {
                Alert.alert("Hata", "Lütfen en az bir öğrenci seçin!");
                return;
              }
              if (!Number.isInteger(Number(compRounds)) || Number(compRounds) < 1 || Number(compRounds) > 1000 ||
                  !Number.isInteger(Number(compArrows)) || Number(compArrows) < 1 || Number(compArrows) > 1000) {
                Alert.alert('Hata', 'Tur ve ok sayısı 1–1000 arasında tam sayı olmalıdır.');
                return;
              }
              competitionId.current = newRecordId();
              setStudentDurations({});
              setMissedStudentIds([]);
              setActiveSessionStartTime(null);
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
                      <Text style={[styles.studentName, { color: theme.text }]}>
                        {student.name.toUpperCase()} {student.surname.toUpperCase()}
                      </Text>
                      <Text style={[styles.studentAge, { color: isMissed ? (themeMode === 'dark' ? '#E0B0FF' : '#D32F2F') : theme.textSecondary }]}>
                        {isFinished ? 'Atışlar Tamamlandı' : (isMissed ? 'PUAN GİRİLMEMİŞ!' : 'Puan Girisi Icin Tikla')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity 
                style={[styles.finishCompButton, { backgroundColor: theme.danger || '#FF3131' }]}
                disabled={isSavingCompetition}
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
                      { text: "Yarışmayı Bitir", onPress: () => { void saveCompetitionToHistory(); } }
                    ]);
                  } else {
                    void saveCompetitionToHistory();
                  }
                }}
              >
                <Text style={styles.finishCompButtonText}>{isSavingCompetition ? 'KAYDEDİLİYOR...' : 'YARIŞMAYI BİTİR'}</Text>
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
                            <Text style={[styles.studentName, { color: theme.text, fontSize: 18 }]}>
                              {student.name.toUpperCase()} {student.surname.toUpperCase()}
                            </Text>
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
              studentName={`${student.name} ${student.surname}`}
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

  // ÖĞRENCİ İNCELEME DETAY EKRANI
  if (view === 'student_detail') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => setView('list')} style={styles.backButtonHeader}>
            <Text style={{ fontSize: 24, color: theme.primary }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Öğrenci İncele</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface, margin: 15 }]}>
          <View style={styles.ppArea}>
            <Text style={{ fontSize: 40 }}>👤</Text>
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={[styles.welcomeText, { color: theme.text }]}>
              {selectedStudent?.name} {selectedStudent?.surname}
            </Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>
              {calculateAge(selectedStudent?.dob || '')} Yaşında ({selectedStudent?.dob})
            </Text>
            {studentHistory.length > 0 && (
              <Text style={[styles.subText, { color: theme.primary, fontWeight: 'bold', marginTop: 4 }]}>
                Genel Ortalama: {(
                  studentHistory.reduce((acc, s) => acc + (s.totalScore || 0), 0) / 
                  studentHistory.reduce((acc, s) => acc + ((s.totalSeries || 0) * (s.arrowsPerSeries || 0)), 0)
                ).toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {selectedStudent?.needsActivation && (
          <TouchableOpacity onPress={() => issueActivation(selectedStudent)} style={{ padding: 16 }}>
            <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: 'bold' }}>İLK GİRİŞ KODU OLUŞTUR</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 20 }]}>Geçmiş Antrenman ve Yarışmalar</Text>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {isLoadingHistory ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.textSecondary }}>Yükleniyor...</Text>
            </View>
          ) : studentHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.textSecondary }}>Henüz kayıt yok.</Text>
            </View>
          ) : (() => {
            // Genel Ortalama Hesapla
            const totalScoreAll = studentHistory.reduce((acc, s) => acc + (s.totalScore || 0), 0);
            const totalArrowsAll = studentHistory.reduce((acc, s) => acc + ((s.totalSeries || 0) * (s.arrowsPerSeries || 0)), 0);
            const generalAvg = totalArrowsAll > 0 ? totalScoreAll / totalArrowsAll : 0;

            return studentHistory.map((session, index) => {
              const sessionAvg = session.totalScore / (session.totalSeries * session.arrowsPerSeries);
              
              // Antrenman Renk Belirleme (Genel Ortalamaya Göre)
              let sessionColor = theme.textSecondary;
              if (sessionAvg > generalAvg + 0.01) sessionColor = '#4CAF50'; // Yeşil
              else if (sessionAvg < generalAvg - 0.01) sessionColor = '#FF5252'; // Kırmızı

              return (
                <View key={session._id || index} style={[styles.historyItemCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionType, { 
                      backgroundColor: session.type === 'competition' ? theme.accent + '30' : theme.primary + '30',
                      color: session.type === 'competition' ? theme.accent : theme.primary
                    }]}>
                      {session.type === 'competition' ? 'YARIŞMA' : 'ANTRENMAN'}
                    </Text>
                    <Text style={[styles.sessionDate, { color: theme.textSecondary }]}>{session.date}</Text>
                  </View>
                  
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>TUR PUANLARI:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {(session.seriesScores || []).map((score: number, sIdx: number) => {
                        // Tur Rengi (Antrenman Ortalamasına Göre)
                        const roundAvg = score / session.arrowsPerSeries;
                        let roundBg = 'rgba(128,128,128,0.1)';
                        let roundText = theme.text;
                        
                        if (roundAvg > sessionAvg + 0.01) {
                          roundBg = 'rgba(76, 175, 80, 0.2)';
                          roundText = '#4CAF50';
                        } else if (roundAvg < sessionAvg - 0.01) {
                          roundBg = 'rgba(255, 82, 82, 0.2)';
                          roundText = '#FF5252';
                        }

                        return (
                          <View key={sIdx} style={{ 
                            backgroundColor: roundBg, 
                            paddingHorizontal: 8, 
                            paddingVertical: 4, 
                            borderRadius: 6, 
                            marginRight: 6, 
                            marginBottom: 6,
                            minWidth: 35,
                            alignItems: 'center',
                            borderWidth: 0.5,
                            borderColor: roundText + '40'
                          }}>
                            <Text style={{ color: roundText, fontSize: 12, fontWeight: 'bold' }}>{score}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.1)', paddingTop: 10 }}>
                    <View>
                      <Text style={[styles.sessionDetail, { color: theme.text, fontWeight: 'bold' }]}>
                        {session.totalSeries} Tur x {session.arrowsPerSeries} Ok
                      </Text>
                      <Text style={[styles.sessionDetail, { color: sessionColor, fontSize: 13, fontWeight: 'bold' }]}>
                        Ok Başı Ortalama: {sessionAvg.toFixed(2)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>TOPLAM PUAN</Text>
                      <Text style={[styles.sessionScore, { color: theme.primary }]}>{session.totalScore}</Text>
                    </View>
                  </View>
                </View>
              );
            });
          })()}
        </ScrollView>
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
          {isLoadingCompHistory ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.textSecondary }}>Yükleniyor...</Text>
            </View>
          ) : competitionHistory.length === 0 ? (
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
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.rounds} Tur x {item.arrowsPerRound} Ok | Toplam Süre: {item.totalDuration}{item.pending ? ' · Gönderilmeyi bekliyor' : ''}</Text>
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
        <View>
          <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }}>● OKÇULUK AKADEMİSİ</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Öğretmen Paneli</Text>
        </View>
        <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton}>
          <Text style={{ fontSize: 24, color: theme.text }}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <View style={styles.infoTextContainer}>
            <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>● AKTİF SEZON</Text>
            <Text style={[styles.welcomeText, { color: theme.text }]}>Hoş Geldiniz,{"\n"}<Text style={{ color: theme.primary }}>Hocam</Text></Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>Sporcu performanslarını izleyin, yarışma serilerini yönetin ve antrenman skorlarını kayıt altına alın.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <View style={{ flex: 1, padding: 13, borderRadius: 16, backgroundColor: theme.scoreBackground, borderWidth: 1, borderColor: theme.borderSoft }}>
                <Text style={{ color: theme.primary, fontSize: 20, fontWeight: '900' }}>{students.length}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3 }}>Kayıtlı Öğrenci</Text>
              </View>
              <View style={{ flex: 1, padding: 13, borderRadius: 16, backgroundColor: theme.scoreBackground, borderWidth: 1, borderColor: theme.borderSoft }}>
                <Text style={{ color: theme.primary, fontSize: 20, fontWeight: '900' }}>{competitionHistory.length}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3 }}>Yarışma Kaydı</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.featuresList}>
          <TouchableOpacity 
            style={[styles.featureItem, { backgroundColor: theme.surface }]}
            onPress={() => setView('list')}
          >
            <Text style={[styles.featureIcon, { color: theme.primary }]}>▣</Text>
            <View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Öğrenci Listesi</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 3 }}>Kayıtlı okçu ve ilerleme raporları</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.featureItem, { backgroundColor: theme.surface }]}
            onPress={() => setView('competition_setup')}
          >
            <Text style={[styles.featureIcon, { color: theme.primary }]}>◎</Text>
            <View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Yarışma Başlat</Text>
              <Text style={{ color: theme.primary, fontSize: 12, marginTop: 3 }}>Canlı seri, hedef ve puan girişi</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.featureItem, { backgroundColor: theme.surface }]}
            onPress={() => setView('competition_history')}
          >
            <Text style={[styles.featureIcon, { color: theme.primary }]}>◷</Text>
            <View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Yarışma Geçmişi</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 3 }}>Tüm skor, madalya ve sıralamalar</Text>
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
