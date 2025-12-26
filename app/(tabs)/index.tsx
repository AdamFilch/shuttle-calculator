import { StyleSheet, View, ViewStyle } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function TabTwoScreen() {
  const router = useRouter()
  const [addShuttleIsOpen, setIsShuttleOpen] = useState(false)

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
      <View>
        <Text>
          Welcome!
        </Text>
        <Text>
          Shuttle Calculator
        </Text>
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