import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function App() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WELCOME</Text>

      <Text style={styles.subtitle}>
        to SmartBee <Text style={styles.bee}>🐝</Text>
      </Text>

     <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/login')}
      >
        <Text style={styles.buttonText}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 56,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 4,
    color: '#1A1A1A',
  },

  subtitle: {
    fontSize: 26,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#2C2C2C',
    marginTop:-20,
    marginLeft:90,
  },

  bee: {
    fontSize: 35,
  },

  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
  },
});




