import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';

export default function TabTwoScreen() {
  const router = useRouter()


  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          alignSelf: 'center',
        }}
      >
        <TouchableOpacity style={buttonStyle}>
          <Text>Add Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={buttonStyle}>
          <Text>Add User</Text>
        </TouchableOpacity>
        <TouchableOpacity style={buttonStyle}>
          <Text>Add Match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={buttonStyle}>
          <Text>Add Shuttles</Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          // alignSelf: 'center',
          width: 'auto',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            router.navigate('/session')
          }}
          style={buttonStyle}
        >
          <Text>Go to Sessions</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity style={buttonStyle}>
          <Text>Add User</Text>
        </TouchableOpacity> */}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});


const buttonStyle: ViewStyle = {
  backgroundColor: 'lightgray',
  width: 100,
  height: 100,
  justifyContent: 'center'
}