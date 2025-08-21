import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { AddSessionModal } from '@/components/session/modal';
import { AddShuttleModal } from '@/components/shuttle/modal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AddUserModal } from '@/components/user/modal';
import { fetchAllShuttles } from '@/services/shuttle';
import { fetchAllUsers } from '@/services/user';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function TabTwoScreen() {
  const router = useRouter()
  const [addSessionIsOpen, setAddSessionIsOpen] = useState(false)
  const [addUserIsOpen, setAddUserIsOpen] = useState(false)
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
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          alignSelf: 'center',
        }}
      >
        <TouchableOpacity style={buttonStyle} onPress={() => {
          setAddSessionIsOpen(true)
        }}>
          <Text>Add Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={buttonStyle} onPress={() => {
          setAddUserIsOpen(true)
        }}>
          <Text>Add User</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity style={buttonStyle}>
          <Text>Add Match</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={buttonStyle} onPress={() => {
          setIsShuttleOpen(true)
        }}>
          <Text>Add Shuttles</Text>
        </TouchableOpacity>
      </View>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        // alignSelf: 'center',
      }}>
        <TouchableOpacity style={buttonStyle} onPress={async () => {
          const res = await fetchAllUsers()
          console.log(`FetchAllUsers`, res)
        }}>
          <Text>Display Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={buttonStyle} onPress={async () => {
          const res = await fetchAllShuttles()
          console.log(`FetchAllShuttles`, res)
        }}>
          <Text>Display Shuttles</Text>
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
      <AddSessionModal open={addSessionIsOpen} onClose={() => setAddSessionIsOpen(false)} />
      <AddUserModal open={addUserIsOpen} onClose={() => setAddUserIsOpen(false)} />
      <AddShuttleModal open={addShuttleIsOpen} onClose={() => setIsShuttleOpen(false)} />
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