import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { AddIcon, CloseIcon, Icon } from "@/components/ui/icon";
import { Modal, ModalBackdrop, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import { Picker } from "@react-native-picker/picker";
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";


export function SelectShuttleButton({
    selectedShuttles,
    onSelect
}: {
    selectedShuttles: string,
    onSelect: (player) => void
}) {
    const [isOpen, setIsOpen] = useState(false)
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
                onClose={() => {
                    setIsOpen(false)
                }}
                onSelect={(player) => {
                    setIsOpen(false)
                    onSelect(player)
                }}
            />
        </Fragment>
    )
}



export function SelectShuttleModal({
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
    const [currentSelectedShuttle, setCurrentSelectedShuttle] = useState<number>(1)
    const pickerRef = useRef(null)

    useEffect(() => {
        if (open) {
            fetchAllShuttles().then(setShuttleList);
            if (selectedShuttle) {
                setCurrentSelectedShuttle(selectedShuttle);
            }
        }
    }, [open]);



    return useMemo(() => {
        return <Modal
            size={'lg'}
            isOpen={open}
            onClose={() => {
                onClose()
            }}
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
                    // <View>

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
                    // </View>
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
            </ModalContent>
        </Modal>
    }, [open, shuttleList, currentSelectedShuttle])
}