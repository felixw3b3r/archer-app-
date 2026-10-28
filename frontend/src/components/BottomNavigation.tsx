import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Item = { id: string; label: string; icon: string };

export default function BottomNavigation({ items, activeId, onSelect, theme }: {
  items: Item[]; activeId: string; onSelect: (id: string) => void; theme: any;
}) {
  return <View style={[styles.shell, { backgroundColor: theme.surface, borderColor: theme.borderSoft || 'rgba(255,255,255,0.14)' }]}>
    {items.map(item => {
      const active = item.id === activeId;
      return <TouchableOpacity key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }}
        style={[styles.item, active && { backgroundColor: 'rgba(0, 229, 208, 0.14)', borderColor: 'rgba(0, 229, 208, 0.48)' }]}
        onPress={() => onSelect(item.id)}>
        <Text style={[styles.icon, { color: active ? theme.primary : theme.textSecondary }]}>{item.icon}</Text>
        <Text numberOfLines={1} style={[styles.label, { color: active ? theme.primary : theme.textSecondary }]}>{item.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  shell: { flexDirection: 'row', alignSelf: 'center', width: '94%', maxWidth: 680, marginBottom: 12, padding: 5, borderWidth: 1, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 16, elevation: 8 },
  item: { flex: 1, minHeight: 58, paddingHorizontal: 6, borderRadius: 24, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22, fontWeight: '800', lineHeight: 24 },
  label: { fontSize: 11, fontWeight: '800', marginTop: 3 },
});
