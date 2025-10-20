import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { AddIcon, CheckIcon, CloseIcon, Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { Modal, ModalBackdrop, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import { Picker } from "@react-native-picker/picker";
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";


export function SelectShuttleButton({
    selectedShuttles,
    onSelect
}: {
    selectedShuttles: string,
    onSelect: (player) => void
}) {
    const [isOpen, setIsOpen] = useState(false)

    const handleClose = useCallback(() => setIsOpen(false), []);
    const handleSelect = useCallback((player) => {
        setIsOpen(false);
        onSelect(player);
    }, [onSelect]);


    return (
        <Fragment>
            <Button
                onPress={() => {
                    setIsOpen(true)
                }}
                style={{
                    width: 150,
                    height: 100,
                    backgroundColor: 'white'
                }}>

                <AddIcon />
            </Button>
            <SelectShuttleModal
                selectedShuttle={1}
                open={isOpen}
                onClose={handleClose}
                onSelect={handleSelect}
            />
        </Fragment>
    )
}



export const SelectShuttleModal = React.memo(function SelectShuttleModal({
    onClose,
    onSelect,
    open,
    selectedShuttle
}: {
    onClose: () => void,
    onSelect: (shuttle_id: number) => void,
    open: boolean,
    selectedShuttle: number
}) {

    const [shuttleList, setShuttleList] = useState<Shuttle[] | null>([])
    const [currentSelectedShuttle, setCurrentSelectedShuttle] = useState(1)
    const [numberShuttles, setNumberShuttles] = useState('')
    const pickerRef = useRef(null)

    useEffect(() => {
        if (!open || shuttleList?.length) return;
        fetchAllShuttles().then(setShuttleList);
        if (selectedShuttle) {
            setCurrentSelectedShuttle(selectedShuttle);
        }
    }, [open]);

    console.log('ShuttlesList', shuttleList)


    return <Modal
        size={'lg'}
        isOpen={open}
        onClose={onClose}

    >
        <ModalBackdrop />
        <ModalContent>
            <ModalHeader>
                <Heading>
                    Select a Shuttle
                </Heading>
                <ModalCloseButton>
                    <Icon
                        as={CloseIcon}
                        size="md"
                        className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
                    />
                </ModalCloseButton>
            </ModalHeader>
            {/* <ModalBody scrollEnabled={false}> */}
            {shuttleList ? (
                <View>
                    <Picker
                        ref={pickerRef}
                        selectedValue={currentSelectedShuttle}
                        onValueChange={(itemValue, itemIndex) =>
                            setCurrentSelectedShuttle(itemValue)
                        }
                    >
                        {shuttleList.map((shuttle) => (
                            <Picker.Item key={shuttle.shuttle_id} label={`${shuttle.name} (${shuttle.total_price} RM)`} value={shuttle.shuttle_id} />
                        ))}
                    </Picker>
                    <Text>
                        Number of this shuttle used
                    </Text>
                    <View style={{
                        display: 'flex',
                        marginBottom: 40,
                        flexDirection: 'row',
                        alignItems: 'center',
                        maxWidth: 250,
                        gap: 10
                    }}>
                        <Input
                            style={{
                                width: '100%'
                            }}
                            variant="outline"
                            size="lg"
                            isDisabled={false}
                            isInvalid={false}
                            isReadOnly={false}
                        >
                            <InputField keyboardType="number-pad" defaultValue={numberShuttles} value={numberShuttles} onChangeText={(val) => {
                                setNumberShuttles(val)
                            }} placeholder="Enter number of shuttles used" />
                        </Input>
                        <Button style={{
                            width: 30,
                            height: 30,
                            backgroundColor: 'white'
                        }} onPress={() => {
                            Keyboard.dismiss()
                        }}>
                            <Icon as={CheckIcon} className="text-typography-400 text-black m-2 w-5 h-5" />
                        </Button>
                    </View>

                </View>
            ) : (
                <View>
                    <Text>
                        You have no Shuttles recorded.
                    </Text>
                </View>
            )}
            {/* </ModalBody> */}
            <ModalFooter>
                <Button
                    variant="outline"
                    action="secondary"
                    onPress={onClose}
                >
                    <ButtonText>Cancel</ButtonText>
                </Button>
                <Button

                    onPress={() => {
                        console.log('PickerREf', currentSelectedShuttle)
                        onSelect(currentSelectedShuttle)
                        onClose()
                    }}
                >
                    <ButtonText>Confirm</ButtonText>
                </Button>
            </ModalFooter>
        </ModalContent >
    </Modal >

})