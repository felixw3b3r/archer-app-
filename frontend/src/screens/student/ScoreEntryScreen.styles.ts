import { StyleSheet, Platform, StatusBar } from 'react-native';

export const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    position: 'relative',
  },
  resetTopButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 48,
    left: 15,
    zIndex: 10,
    width: 45,
    height: 45,
    borderRadius: 22.5, // Tam daire için genişliğin yarısı
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetTopButtonText: {
    color: theme.danger,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 48,
    right: 15,
    zIndex: 10,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    color: theme.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32, // Daha büyük punto
    fontWeight: '800', // Daha kalın (Ekstra Bold)
    color: theme.primary, // Tema vurgu rengi
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1, // Harfler arası hafif boşluk (premium görünüm)
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  settingBox: {
    alignItems: 'center',
  },
  settingLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    marginBottom: 5,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.scoreBackground,
    borderRadius: 12,
    padding: 5,
  },
  controlBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 20,
    color: theme.primary,
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginHorizontal: 15,
    minWidth: 25,
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  seriesInfo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.accent,
    marginBottom: 30,
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  zeroButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: theme.miss,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  zeroText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreControlBtn: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  scoreControlText: {
    fontSize: 32,
    color: theme.primary,
  },
  scoreInputWrapper: {
    marginHorizontal: 15,
    backgroundColor: theme.scoreBackground,
    borderRadius: 15,
    padding: 10,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.primary,
  },
  scoreInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    padding: 0,
  },
  saveButton: {
    backgroundColor: theme.primary,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 40,
    width: '80%',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  editPreviousButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.miss, // veya gri bir ton
    alignItems: 'center',
  },
  editPreviousText: {
    color: theme.miss, // veya gri bir ton
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── History Screen Styles ─────────────────────────────────
  historyHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  historyMenuButton: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 55,
    padding: 5,
  },
  historyMenuButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
  },
  scoreContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalScoreText: {
    fontSize: 28,
    fontWeight: '900',
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 15,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  seriesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  seriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  seriesBox: {
    width: '22%',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  seriesIndex: {
    fontSize: 10,
    marginBottom: 5,
  },
  seriesScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
