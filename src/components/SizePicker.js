import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

export default function SizePicker({ sizes, onSelect, selectedKey, header, footer }) {
  const data = useMemo(
    () => Object.entries(sizes).map(([key, val]) => ({ key, ...val })),
    [sizes]
  );

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={data}
      keyExtractor={(item) => item.key}
      numColumns={2}
      columnWrapperStyle={{ gap: 10 }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={header ?? null}
      ListFooterComponent={footer ?? null}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, selectedKey === item.key && styles.cardSelected]}
          onPress={() => onSelect(item.key)}
        >
          <Text style={styles.title}>{item.label}</Text>
          <Text style={styles.sub}>{item.mm.w}×{item.mm.h} mm</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24 },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff'
  },
  cardSelected: {
    borderColor: '#2563eb',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  title: { fontWeight: '600', fontSize: 16, color: '#111827' },
  sub: { marginTop: 4, color: '#6b7280' }
});