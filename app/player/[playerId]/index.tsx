import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentConfirmationDialog } from "@/components/shared/PaymentConfirmationDialog";
import { Button, ButtonText } from "@/components/ui/button";
import { Checkbox, CheckboxIcon, CheckboxIndicator } from "@/components/ui/checkbox";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { CheckIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchPlayerById, fetchShuttlePaymentsByPlayerSessions, Player, ShuttleInstanceCharge, ShuttlePaymentsByPlayerSessions } from "@/services/player";
import { payShuttleInstancesByIds } from "@/services/shuttle-payments";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SelectPlayerPage() {
    const { playerId } = useLocalSearchParams()
    const [player, setPlayer] = useState<Player | null>(null)
    const [shuttlePayments, setShuttlePayments] = useState<ShuttlePaymentsByPlayerSessions | null>(null)
    const [SelectShuttleMode, toggleShuttleMode] = useState(false)
    const [selectedCharges, setSelectedCharges] = useState<ShuttleInstanceCharge[]>([])
    const [openConfirmation, setOpenConfirmation] = useState(false)


    useFocusEffect(
        useCallback(() => {
            fetchPlayerAndShuttles()
        }, [playerId])

    )
    const fetchPlayerAndShuttles = async () => {
        fetchPlayerById(playerId.toString()).then((res) => {
            setPlayer(res[0])
            fetchShuttlePaymentsByPlayerSessions(res[0].player_id).then((res) => {
                setShuttlePayments(res)
            })
        })
    }

    const handlePayShuttles = async () => {
        payShuttleInstancesByIds({
            shuttleCharges: selectedCharges,
            player_id: playerId.toString()
        }).then(() => {
            setOpenConfirmation(false)
            setSelectedCharges([])
            fetchPlayerAndShuttles()
        })
    }


    if (!player) {
        return (
            <SafeAreaView className="flex-1 bg-background-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0F9D82" />
            </SafeAreaView>
        )
    }
    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader title={player.name} />
            <ScrollView className="flex-1 px-4">
                {shuttlePayments && (
                    <VStack space="md" className="pb-8 pt-2">
                        <HStack space="sm">
                            {SelectShuttleMode ? (
                                <>
                                    <Button
                                        onPress={() => {
                                            setOpenConfirmation(true)
                                        }}
                                    >
                                        <ButtonText>Pay ({selectedCharges.length})</ButtonText>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        action="secondary"
                                        onPress={() => {
                                            setSelectedCharges([])
                                            toggleShuttleMode(false)
                                        }}
                                    >
                                        <ButtonText>Cancel</ButtonText>
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onPress={() => {
                                        toggleShuttleMode(true)
                                    }}
                                >
                                    <ButtonText>Pay Shuttles</ButtonText>
                                </Button>
                            )}
                        </HStack>

                        {shuttlePayments.sessions.map((session, idx) => {
                            const unpaidCharges = session.shuttle_charges.filter((c) => c.date_paid === null)

                            if (unpaidCharges.length === 0) return null

                            return (
                                <VStack key={idx} space="sm">
                                    <HStack space="xs" className="items-center">
                                        <Heading size="md" className="text-typography-900">
                                            {session.name == '' ? DisplayTimeDDDASHMMDASHYYYY(session.date) : session.name}
                                        </Heading>
                                        {session.court_total_owed > 0 && (
                                            <Text size="sm" className="text-typography-500">
                                                (${session.court_total_owed.toFixed(2)})
                                            </Text>
                                        )}
                                    </HStack>
                                    <VStack space="sm">
                                        {unpaidCharges
                                            .sort((a, b) => b.owed_amount - a.owed_amount)
                                            .map((charge, chargeIdx) => {
                                                const isSelected = selectedCharges.some((v) => v.shuttle_instance_id == charge.shuttle_instance_id)

                                                return (
                                                    <ListRow
                                                        key={chargeIdx}
                                                        title={charge.name}
                                                        subtitle={`$${charge.owed_amount.toFixed(2)}${charge.matches_used_in.length > 1 ? ` · used in ${charge.matches_used_in.length} matches` : ""}`}
                                                        selected={SelectShuttleMode && isSelected}
                                                        trailing={SelectShuttleMode ? (
                                                            <Checkbox value={String(charge.shuttle_instance_id)} isChecked={isSelected} onChange={() => {
                                                                if (!isSelected) {
                                                                    setSelectedCharges([...selectedCharges, charge])
                                                                } else {
                                                                    setSelectedCharges(prev => prev.filter((v) => v.shuttle_instance_id !== charge.shuttle_instance_id))
                                                                }
                                                            }}>
                                                                <CheckboxIndicator>
                                                                    <CheckboxIcon as={CheckIcon} />
                                                                </CheckboxIndicator>
                                                            </Checkbox>
                                                        ) : undefined}
                                                        onLongPress={() => {
                                                            if (!SelectShuttleMode) {
                                                                toggleShuttleMode(true)
                                                                setSelectedCharges([charge])
                                                            }
                                                        }}
                                                        onPress={() => {
                                                            if (SelectShuttleMode) {
                                                                if (!isSelected) {
                                                                    setSelectedCharges([...selectedCharges, charge])
                                                                } else {
                                                                    setSelectedCharges(prev => prev.filter((v) => v.shuttle_instance_id !== charge.shuttle_instance_id))
                                                                }
                                                            }
                                                        }}
                                                    />
                                                )
                                            })}
                                    </VStack>
                                </VStack>
                            )
                        })}
                    </VStack>
                )}
                <PaymentConfirmationDialog
                    isOpen={openConfirmation}
                    onClose={() => {
                        setOpenConfirmation(false)
                    }}
                    onConfirm={() => {
                        handlePayShuttles()
                    }}
                />
            </ScrollView>
        </SafeAreaView>
    )
}
