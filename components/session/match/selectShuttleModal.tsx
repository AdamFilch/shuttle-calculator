import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { AddIcon, CheckIcon, ChevronDownIcon, CloseIcon, Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { createNewMatchShuttle, ShuttleCondition } from "@/services/match";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import { Keyboard, View } from "react-native";


export function SelectShuttleButton({
    selectedShuttles,
    onSelect
}: {
    selectedShuttles: createNewMatchShuttle[] | [],
    onSelect: (selected: createNewMatchShuttle) => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [usedShuttles, setUsedShuttles] = useState<createNewMatchShuttle[] | []>(selectedShuttles)
    const handleClose = useCallback(() => setIsOpen(false), []);
    const handleSelect = useCallback((selected) => {
        setUsedShuttles(selected)
        setIsOpen(false);
        onSelect(selected);
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
    onSelect: (selected: createNewMatchShuttle) => void,
    open: boolean,
    selectedShuttle: number
}) {

    const [shuttleList, setShuttleList] = useState<Shuttle[] | null>([])
    const [currentSelectedShuttle, setCurrentSelectedShuttle] = useState(1)
    const [shuttleCondition, setShuttleCondition] = useState<ShuttleCondition>("New")
    const [numberShuttles, setNumberShuttles] = useState('')

    useEffect(() => {
        if (!open || shuttleList?.length) return;
        fetchAllShuttles().then(setShuttleList);
        if (selectedShuttle) {
            setCurrentSelectedShuttle(selectedShuttle);
        }
    }, [open]);



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
            <ModalBody scrollEnabled={false}>
                {shuttleList ? (
                    <VStack space="md">
                        <Select
                            selectedValue={String(currentSelectedShuttle)}
                            onValueChange={(val) => setCurrentSelectedShuttle(parseInt(val))}
                        >
                            <SelectTrigger variant="outline" size="lg">
                                <SelectInput className="flex-1" placeholder="Select a shuttle" />
                                <SelectIcon className="mr-3" as={ChevronDownIcon} />
                            </SelectTrigger>
                            <SelectPortal>
                                <SelectBackdrop />
                                <SelectContent>
                                    <SelectDragIndicatorWrapper>
                                        <SelectDragIndicator />
                                    </SelectDragIndicatorWrapper>
                                    {shuttleList.map((shuttle) => (
                                        <SelectItem
                                            key={shuttle.shuttle_id}
                                            label={`${shuttle.name} (${shuttle.total_price} RM)`}
                                            value={String(shuttle.shuttle_id)}
                                        />
                                    ))}
                                </SelectContent>
                            </SelectPortal>
                        </Select>
                        <Text size="sm" className="text-typography-500">
                            Number of this shuttle used
                        </Text>
                        <HStack className="items-center gap-2.5">
                            <Input
                                className="flex-1"
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
                            <Button
                                variant="outline"
                                action="secondary"
                                size="lg"
                                onPress={() => {
                                    Keyboard.dismiss()
                                }}>
                                <Icon as={CheckIcon} className="text-typography-700 w-5 h-5" />
                            </Button>
                        </HStack>
                    </VStack>
                ) : (
                    <View>
                        <Text>
                            You have no Shuttles recorded.
                        </Text>
                    </View>
                )}
            </ModalBody>
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
                        onSelect({
                            shuttleId: currentSelectedShuttle,
                            quantityUsed: parseInt(numberShuttles),
                            condition: shuttleCondition
                        })
                        onClose()
                    }}
                >
                    <ButtonText>Confirm</ButtonText>
                </Button>
            </ModalFooter>
        </ModalContent >
    </Modal >

})