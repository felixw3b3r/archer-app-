import React from 'react';
import { View } from 'react-native';
import ScoreEntryScreen from './ScoreEntryScreen';
import HistoryScreen from './HistoryScreen';

interface StudentDashboardProps {
  currentScreen: string;
  onOpenMenu: () => void;
  themeMode: 'dark' | 'light';
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentScreen, onOpenMenu, themeMode }) => {
  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Home' ? (
        <ScoreEntryScreen onOpenMenu={onOpenMenu} themeMode={themeMode} />
      ) : (
        <HistoryScreen onOpenMenu={onOpenMenu} themeMode={themeMode} />
      )}
    </View>
  );
};

export default StudentDashboard;
