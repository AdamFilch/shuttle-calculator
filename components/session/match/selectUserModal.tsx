'use client'

import { Button, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { Player } from "@/services/player"
import { Fragment, useState } from "react"
import { FlatList, Pressable, Text, View } from "react-native"


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
                selectedPlayer={selectedPlayer}
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
    players,
    selectedPlayer
}: {
    open: boolean,
    onClose: () => void,
    onSelect: (player) => void,
    players: Player[],
    selectedPlayer?: string,
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
                <ModalBody scrollEnabled={false}>
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
                            renderItem={(player) => {
                                const isSelected = selectedPlayer != null && player.item.player_id == parseInt(selectedPlayer)
                                return (
                                    <Pressable
                                        onPress={() => {
                                            onSelect(player.item.player_id)
                                        }}
                                        className={`flex-1 items-center justify-center rounded-xl border px-2 py-4 ${isSelected ? "border-primary-500 bg-primary-50" : "border-outline-100 bg-background-0"}`}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            className={`text-base font-bold ${isSelected ? "text-primary-700" : "text-typography-900"}`}
                                        >
                                            {player.item.name}
                                        </Text>
                                    </Pressable>
                                )
                            }}
                        />
                    ) : (
                        <View>
                            <Text>
                                You have no players recorded.
                            </Text>
                        </View>
                    )}
                </ModalBody>
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
