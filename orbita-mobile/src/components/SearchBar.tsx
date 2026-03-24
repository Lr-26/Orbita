import React, { useState } from 'react';
import { View, TextInput, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';

interface Props {
  onSearch: (text: string) => void;
  results: any[];
  onSelect: (item: any) => void;
}

export function SearchBar({ onSearch, results, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onSearch(query);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar en Orbita..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
      </View>
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(_, i) => i.toString()}
          style={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => { setQuery(''); onSelect(item); }}>
              <Text style={styles.resultText}>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  inputContainer: {
    backgroundColor: 'rgba(20, 20, 28, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    color: 'white',
    fontSize: 16,
  },
  resultsList: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: 250,
  },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultText: {
    color: '#333',
  }
});
