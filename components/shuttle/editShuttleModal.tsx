import {
    addShuttlePurchase,
    fetchShuttlePurchaseHistory,
    ShuttlePurchase,
    ShuttleWithInventory,
    updateShuttle
} from "@/services/shuttle"
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display"
import { useEffect, useState } from "react"
import { Button, ButtonText } from "../ui/button"
import { Divider } from "../ui/divider"
import { Heading } from "../ui/heading"
import { CloseIcon, Icon } from "../ui/icon"
import { Input, InputField } from "../ui/input"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "../ui/modal"
import { Text } from "../ui/text"
import { VStack } from "../ui/vstack"

export function EditShuttleModal({
    open,
    shuttle,
    onClose
}: {
    open: boolean,
    shuttle: ShuttleWithInventory | null,
    onClose: () => void
}) {
    const [name, setName] = useState("")
    const [pricePerShuttle, setPricePerShuttle] = useState("")
    const [purchaseHistory, setPurchaseHistory] = useState<ShuttlePurchase[]>([])
    const [buyAgainQty, setBuyAgainQty] = useState("")

    useEffect(() => {
        if (open && shuttle) {
            setName(shuttle.name)
            setPricePerShuttle((Number(shuttle.total_price) / Number(shuttle.num_of_shuttles)).toFixed(2))
            setBuyAgainQty("")
            fetchShuttlePurchaseHistory(shuttle.shuttle_id).then(setPurchaseHistory)
        }
    }, [open, shuttle])

    const canSave = name.trim().length > 0 && parseFloat(pricePerShuttle) > 0
    const canBuyAgain = parseInt(buyAgainQty) > 0

    async function onClickSave() {
        if (!shuttle || !canSave) return

        await updateShuttle({
            shuttle_id: shuttle.shuttle_id,
            name: name.trim(),
            price_per_shuttle: parseFloat(pricePerShuttle)
        })

        onClose()
    }

    async function onClickBuyAgain() {
        if (!shuttle || !canBuyAgain) return

        await addShuttlePurchase({
            shuttle_id: shuttle.shuttle_id,
            num_of_shuttles: parseInt(buyAgainQty)
        })

        setBuyAgainQty("")
        fetchShuttlePurchaseHistory(shuttle.shuttle_id).then(setPurchaseHistory)
    }

    return (
        <Modal isOpen={open} onClose={onClose}>
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading>Edit {shuttle?.name}</Heading>
                    <ModalCloseButton>
                        <Icon
                            as={CloseIcon}
                            size="md"
                            className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
                        />
                    </ModalCloseButton>
                </ModalHeader>
                <ModalBody>
                    <VStack space="md">
                        <VStack space="xs">
                            <Text size="sm" className="text-typography-500">Name</Text>
                            <Input variant="outline" size="md">
                                <InputField
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter a Shuttle Name"
                                />
                            </Input>
                        </VStack>

                        <VStack space="xs">
                            <Text size="sm" className="text-typography-500">Price per Shuttle</Text>
                            <Input variant="outline" size="md">
                                <InputField
                                    keyboardType="decimal-pad"
                                    value={pricePerShuttle}
                                    onChangeText={setPricePerShuttle}
                                    placeholder="Enter the price per shuttle"
                                />
                            </Input>
                        </VStack>

                        <Divider />

                        <VStack space="xs">
                            <Text size="sm" bold className="text-typography-700">Recent Purchases</Text>
                            {purchaseHistory.length === 0 ? (
                                <Text size="sm" className="text-typography-500">No purchases yet</Text>
                            ) : (
                                purchaseHistory.map((purchase) => (
                                    <Text key={purchase.shuttle_purchase_id} size="sm" className="text-typography-500">
                                        {DisplayTimeDDDASHMMDASHYYYY(purchase.date)} · +{purchase.num_of_shuttles} shuttles
                                    </Text>
                                ))
                            )}
                        </VStack>

                        <Divider />

                        <VStack space="xs">
                            <Text size="sm" bold className="text-typography-700">Buy Again</Text>
                            <Input variant="outline" size="md">
                                <InputField
                                    keyboardType="number-pad"
                                    value={buyAgainQty}
                                    onChangeText={setBuyAgainQty}
                                    placeholder="Enter the number of shuttles"
                                />
                            </Input>
                            <Button
                                variant="outline"
                                isDisabled={!canBuyAgain}
                                onPress={onClickBuyAgain}
                            >
                                <ButtonText>Add to Inventory</ButtonText>
                            </Button>
                        </VStack>
                    </VStack>
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
                        isDisabled={!canSave}
                        onPress={onClickSave}
                    >
                        <ButtonText>Save</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
