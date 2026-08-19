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
import { fetchPlayerById, fetchShuttlePaymentsByPlayerSessions, Player, ShuttlePaymentsByPlayerSessions } from "@/services/player";
import { payShuttleByIds } from "@/services/shuttle-payments";
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
    const [selectedShuttles, setSelectedShuttles] = useState([])
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
        payShuttleByIds({
            matches: selectedShuttles,
            player_id: playerId.toString()
        }).then(() => {
            setOpenConfirmation(false)
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
                                        <ButtonText>Pay ({selectedShuttles.length})</ButtonText>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        action="secondary"
                                        onPress={() => {
                                            setSelectedShuttles([])
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
                                        {session.matches_played
                                            .sort((match1, match2) => {
                                                let totalCostsM2 = match2.shuttles.reduce((acc, shuttle) => {
                                                    return acc + shuttle.owed_amount
                                                }, 0)
                                                let totalCostsM1 = match1.shuttles.reduce((acc, shuttle) => {
                                                    return acc + shuttle.owed_amount
                                                }, 0)

                                                return totalCostsM2 - totalCostsM1
                                            })
                                            .map((match, matchIdx) => {
                                                const numOfShuttle = match.shuttles.filter((shu) => shu.owed_amount > 0).length
                                                const totalCosts = match.shuttles.reduce((acc, shuttle) => {
                                                    return acc + shuttle.owed_amount
                                                }, 0)
                                                const isSelected = selectedShuttles.some((v) => v.match_id == match.match_id)

                                                return (
                                                    <ListRow
                                                        key={matchIdx}
                                                        title={`Match ${match.match_number}`}
                                                        subtitle={`${numOfShuttle} unpaid · $${totalCosts.toFixed(2)} total`}
                                                        selected={SelectShuttleMode && isSelected}
                                                        trailing={SelectShuttleMode ? (
                                                            <Checkbox value={String(match.match_id)} isChecked={isSelected} onChange={() => {
                                                                if (!isSelected) {
                                                                    setSelectedShuttles([...selectedShuttles, {
                                                                        ...match,
                                                                        numOfShuttle,
                                                                        totalCosts
                                                                    }])
                                                                } else {
                                                                    setSelectedShuttles(prev => prev.filter((v) => v.match_id !== match.match_id))
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
                                                                setSelectedShuttles([{
                                                                    ...match,
                                                                    numOfShuttle,
                                                                    totalCosts
                                                                }])
                                                            }
                                                        }}
                                                        onPress={() => {
                                                            if (SelectShuttleMode) {
                                                                if (!isSelected) {
                                                                    setSelectedShuttles([...selectedShuttles, {
                                                                        ...match,
                                                                        numOfShuttle,
                                                                        totalCosts
                                                                    }])
                                                                } else {
                                                                    setSelectedShuttles(prev => prev.filter((v) => v.match_id !== match.match_id))
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
