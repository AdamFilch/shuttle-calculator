'use client'

import { Button, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { Modal, ModalBackdrop, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { Player } from "@/services/player"
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
    players: Player[],
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
                    {selectedPlayer ? players.find((player) => player.player_id == parseInt(selectedPlayer)).name :placeholder}
                </ButtonText>
            </Button>
            <SelectPlayerModal
                players={players}
                open={isOpen}
                onClose={() => {
                    setIsOpen(false)
                }}
                onSelect={(player) => {
                    console.log("You selected this player", player)
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
    players: Player[],
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
                        numColumns={3}
                        contentContainerStyle={{
                            gap: 10
                        }}
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
                                onSelect(player.item.player_id)
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

