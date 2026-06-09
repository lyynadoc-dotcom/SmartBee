import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

return (
    <View style={styles.container}>
      <Text style={styles.title}>WELCOME</Text>
      <Text style={styles.subtitle}>
        to SmartBee <Text style={styles.bee}>🐝</Text>
      </Text>
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



