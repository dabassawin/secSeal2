import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import ScanScreen from './src/views/ScanScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <ScanScreen />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
