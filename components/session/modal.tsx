import { Modal, Text, TextInput, View } from "react-native"

export function AddSessionModal({
    open
}: {
    open: boolean
}) {
    return (
        <Modal
            transparent
            visible={open}
            animationType="slide"
            
        >
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                
            }}>
                <View style={{
                    margin: 20,
                    backgroundColor: 'white',
                    borderRadius: 20,
                    padding: 35,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                }}>
                    <Text>Add a session name</Text>
                    <Text>(Default to todays date)</Text>
                    <TextInput />
                </View>
            </View>
        </Modal>
    )
}