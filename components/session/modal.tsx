import { DebtChip } from "@/components/shared/DebtChip";
import { PaymentConfirmationDialog } from "@/components/shared/PaymentConfirmationDialog";
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
} from "@/components/ui/checkbox";
import { bookCourt } from "@/services/court";
import {
  fetchAllPlayerPaymentsBySession,
  PlayersShuttlePayments,
} from "@/services/player";
import { createNewSession } from "@/services/session";
import { payShuttleByPlayers } from "@/services/shuttle-payments";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Button, ButtonText } from "../ui/button";
import { Heading } from "../ui/heading";
import { HStack } from "../ui/hstack";
import { CheckIcon, CloseIcon, Icon } from "../ui/icon";
import { Input, InputField } from "../ui/input";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "../ui/modal";
import { Text } from "../ui/text";
import { VStack } from "../ui/vstack";

export function AddSessionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [location, setLocation] = useState("");

  const [isBookingCourts, setIsBookingCourts] = useState(false);
  const [courtLabel, setCourtLabel] = useState("");
  const [courtPrice, setCourtPrice] = useState("");
  const [courtQuantity, setCourtQuantity] = useState("");
  const [courtDurationHours, setCourtDurationHours] = useState("");

  const courtFieldsValid =
    (parseInt(courtQuantity) || 0) > 0 &&
    (parseFloat(courtDurationHours) || 0) > 0 &&
    courtPrice.trim() !== "" &&
    (parseFloat(courtPrice) || -1) >= 0;
  const canSave = !isBookingCourts || courtFieldsValid;

  function resetForm() {
    setDate(new Date());
    setStartTime(new Date());
    setTitle("");
    setLocation("");
    setIsBookingCourts(false);
    setCourtLabel("");
    setCourtPrice("");
    setCourtDurationHours("");
    setCourtQuantity("");
  }

  async function onClickSave() {
    if (!canSave) return;

    const hours = String(startTime.getHours()).padStart(2, "0");
    const minutes = String(startTime.getMinutes()).padStart(2, "0");

    const sessionId = await createNewSession({
      name: title,
      date: date.toISOString(),
      startTime: `${hours}:${minutes}`,
      location,
    });

    if (!sessionId) return;

    if (isBookingCourts) {
      await bookCourt({
        sessionId,
        label: courtLabel || undefined,
        price: parseFloat(courtPrice),
        quantity: parseInt(courtQuantity),
        durationMinutes: parseFloat(courtDurationHours) * 60,
      });
    }

    resetForm();
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        onClose();
      }}
    >
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading>Add a Session</Heading>
          <ModalCloseButton>
            <Icon
              as={CloseIcon}
              size="md"
              className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
            />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            <Text size="sm" className="text-typography-500">
              (Title will defaults to today's date)
            </Text>
            <Input
              variant="outline"
              size="md"
              isDisabled={false}
              isInvalid={false}
              isReadOnly={false}
            >
              <InputField
                defaultValue={title}
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                }}
                maxLength={30}
                placeholder="Enter a session title (Optional)"
              />
            </Input>
            <Text size="sm" className="text-typography-500">
              (Title will defaults to today's date)
            </Text>
            <HStack space={"sm"} className="-ml-2">
              <DateTimePicker
                mode="date"
                value={date}
                onChange={(e, val) => {
                  setDate(val);
                }}
              />
              <DateTimePicker
                mode="time"
                is24Hour
                value={startTime}
                onChange={(e, val) => {
                  if (val) setStartTime(val);
                }}
              />
            </HStack>

            <Input variant="outline" size="md">
              <InputField
                value={location}
                onChangeText={setLocation}
                maxLength={60}
                placeholder="Location of the session (Optional)"
              />
            </Input>

            <Button
              variant={isBookingCourts ? "solid" : "outline"}
              action={isBookingCourts ? "primary" : "secondary"}
              onPress={() => setIsBookingCourts((prev) => !prev)}
            >
              <ButtonText>
                {isBookingCourts ? "Booking Courts" : "Book Courts?"}
              </ButtonText>
            </Button>
            {isBookingCourts && (
              <VStack space="sm">
                <Text size="sm" className="text-typography-500">
                  Price is per court. The total (price x quantity) is split
                  evenly among the session&apos;s players when the session is
                  closed.
                </Text>
                <Input variant="outline" size="md">
                  <InputField
                    value={courtLabel}
                    onChangeText={setCourtLabel}
                    placeholder="Court label (optional)"
                  />
                </Input>
                <Input
                  variant="outline"
                  size="md"
                  isInvalid={(parseInt(courtQuantity) || 0) <= 0}
                >
                  <InputField
                    value={courtQuantity}
                    onChangeText={setCourtQuantity}
                    placeholder="How many courts"
                    keyboardType="number-pad"
                  />
                </Input>
                <Input
                  variant="outline"
                  size="md"
                  isInvalid={(parseFloat(courtDurationHours) || 0) <= 0}
                >
                  <InputField
                    value={courtDurationHours}
                    onChangeText={setCourtDurationHours}
                    placeholder="Booking length in hours"
                    keyboardType="decimal-pad"
                  />
                </Input>
                <Input
                  variant="outline"
                  size="md"
                  isInvalid={
                    courtPrice.trim() === "" ||
                    (parseFloat(courtPrice) || -1) < 0
                  }
                >
                  <InputField
                    value={courtPrice}
                    onChangeText={setCourtPrice}
                    placeholder="Court price per session"
                    keyboardType="decimal-pad"
                  />
                </Input>
              </VStack>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            isDisabled={!canSave}
            onPress={() => {
              onClickSave();
            }}
          >
            <ButtonText>Create New Session</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function PayByPlayerModal({
  open,
  onClose,
  onConfirm,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionId: string;
}) {
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [playerPayments, setPlayerPayments] = useState<
    PlayersShuttlePayments[] | null
  >(null);
  const [selectedPlayers, setSelectedPlayers] = useState<
    PlayersShuttlePayments[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      fetchPlayerPayments();
    }, [open]),
  );

  const fetchPlayerPayments = async () => {
    fetchAllPlayerPaymentsBySession(sessionId).then((res) => {
      setPlayerPayments(res);
    });
  };

  const handlePayment = async () => {
    if (selectedPlayers.length > 0) {
      payShuttleByPlayers({ players: selectedPlayers }).then(() => {
        fetchPlayerPayments();
      });
    }
  };

  const toggleSelection = (player: PlayersShuttlePayments) => {
    setSelectedPlayers((prev) =>
      prev.some((v) => v.player_id == player.player_id)
        ? prev.filter((v) => v.player_id != player.player_id)
        : [...prev, player],
    );
  };

  return (
    <Modal
      isOpen={open}
      size={"lg"}
      onClose={() => {
        setSelectedPlayers([]);
        onClose();
      }}
    >
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading>Shuttle Payment by Player</Heading>
          <ModalCloseButton>
            <Icon
              as={CloseIcon}
              size="md"
              className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
            />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            <Button
              variant="outline"
              action="secondary"
              size="sm"
              className="self-end"
              onPress={() => {
                if (selectedPlayers.length > 0) {
                  setSelectedPlayers([]);
                } else {
                  setSelectedPlayers(playerPayments ?? []);
                }
              }}
            >
              <ButtonText>
                {selectedPlayers.length > 0 ? "Deselect All" : "Select All"}
              </ButtonText>
            </Button>
            {playerPayments && (
              <View className="flex-row flex-wrap gap-3">
                {playerPayments
                  .filter((v) => v.total_owed_amount != 0)
                  .map((player) => {
                    const isSelected = selectedPlayers.some(
                      (v) => v.player_id == player.player_id,
                    );
                    return (
                      <Pressable
                        key={player.player_id}
                        onPress={() => toggleSelection(player)}
                        className={`w-[104px] items-center gap-1.5 rounded-xl border px-2 py-3 ${isSelected ? "border-primary-500 bg-primary-50" : "border-outline-100 bg-background-0"}`}
                      >
                        <Checkbox
                          value={String(player.player_id)}
                          isChecked={isSelected}
                          onChange={() => toggleSelection(player)}
                          className="self-end"
                        >
                          <CheckboxIndicator>
                            <CheckboxIcon as={CheckIcon} />
                          </CheckboxIndicator>
                        </Checkbox>
                        <Text
                          bold
                          numberOfLines={1}
                          className="text-typography-900"
                        >
                          {player.name}
                        </Text>
                        <DebtChip amount={player.total_owed_amount} />
                      </Pressable>
                    );
                  })}
              </View>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            action="secondary"
            onPress={() => {
              onClose();
            }}
          >
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button
            onPress={() => {
              setOpenConfirmation(true);
            }}
          >
            <ButtonText>Confirm Payment</ButtonText>
          </Button>
          <PaymentConfirmationDialog
            isOpen={openConfirmation}
            onClose={() => {
              setOpenConfirmation(false);
            }}
            onConfirm={() => {
              setOpenConfirmation(false);
              handlePayment();
            }}
          />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
