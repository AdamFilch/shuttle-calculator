'use client'

import { Button, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { Modal, ModalBackdrop, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { User } from "@/services/user"
import { Fragment, useState } from "react"
import { FlatList, Text, View } from "react-native"


export function SelectPlayerButton({
    placeholder,
    selectedPlayer,
    players,
    onSelect
}: {
    placeholder: string,
    selectedPlayer?: string,
    players: User[],
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

                <ButtonText>
                    {selectedPlayer ?? placeholder}
                </ButtonText>
            </Button>
            <SelectPlayerModal
                players={players}
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


export function SelectPlayerModal({
    open,
    onClose,
    onSelect,
    players
}: {
    open: boolean,
    onClose: () => void,
    onSelect: (player) => void,
    players: User[],
}) {

    return (
        <Modal
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
                        Select a player here
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
                {players ? (
                    <FlatList

                        data={players}
                        // keyExtractor={(player: User, idx) => idx.toString()}
                        numColumns={3}
                        columnWrapperStyle={{
                            columnGap: 10
                        }}
                        renderItem={(player) => (
                            <Button 
                            style={{
                                width: 100,
                                height: 100
                            }}
                            onPress={() => {
                                onSelect(player.item.user_id)
                            }}
                            >
                                <ButtonText>
                                    {player.item.name}
                                </ButtonText>
                            </Button>
                        )}
                    />
                  ) : (
                    <View>
                        <Text>
                            You have no players recorded.
                        </Text>
                    </View>
                )}
                {/* </ModalBody> */}
                <ModalFooter>
                    <Button
                        variant="outline"
                        action="secondary"
                        onPress={() => {
                            onClose()
                        }}
                    >
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

