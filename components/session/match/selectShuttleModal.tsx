import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import {
    AddIcon,
    ChevronDownIcon,
    CloseIcon,
    Icon,
} from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import {
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui/modal";
import {
    Select,
    SelectBackdrop,
    SelectContent,
    SelectDragIndicator,
    SelectDragIndicatorWrapper,
    SelectIcon,
    SelectInput,
    SelectItem,
    SelectPortal,
    SelectTrigger,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ShuttleSelection } from "@/services/match";
import {
    fetchAllShuttlesWithInventory,
    ShuttleWithInventory,
} from "@/services/shuttle";
import {
    fetchShuttleInstancesBySessionId,
    ShuttleInstance,
} from "@/services/shuttle_instances";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";

type ShuttleMode = "new" | "reused" | "free";

export function SelectShuttleButton({
  sessionId,
  selectedShuttles,
  onSelect,
}: {
  sessionId: number;
  selectedShuttles: ShuttleSelection[];
  onSelect: (selected: ShuttleSelection) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [shuttleList, setShuttleList] = useState<ShuttleWithInventory[]>([]);
  const [instanceList, setInstanceList] = useState<ShuttleInstance[]>([]);

  useEffect(() => {
    fetchAllShuttlesWithInventory().then(setShuttleList);
    fetchShuttleInstancesBySessionId(sessionId).then(setInstanceList);
  }, [sessionId]);

  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleSelect = useCallback(
    (selected: ShuttleSelection) => {
      setIsOpen(false);
      onSelect(selected);
    },
    [onSelect],
  );

  const labelFor = (selection: ShuttleSelection): string => {
    if (selection.mode === "new") {
      const shuttle = shuttleList.find(
        (s) => s.shuttle_id === selection.shuttleId,
      );
      return shuttle ? `${shuttle.name}` : `Shuttle`;
    }
    if (selection.mode === "reused") {
      const instance = instanceList.find(
        (i) => i.shuttle_instance_id === selection.shuttleInstanceId,
      );
      return instance?.label ?? "Reused shuttle";
    }
    return "Free shuttle";
  };

  return (
    <Fragment>
      <View className="flex-row flex-wrap gap-2">
        {selectedShuttles.map((selection, i) => (
          <View
            key={i}
            className="items-center justify-center rounded-xl border border-primary-500 bg-primary-50 px-3 py-3"
          >
            <Text
              numberOfLines={2}
              className="text-sm font-bold text-primary-700"
            >
              {labelFor(selection)}
            </Text>
            {selection.mode === "new" && (
              <Text
                numberOfLines={1}
                className="text-sm font-bold text-primary-700"
              >
                x {selection.quantity}
              </Text>
            )}
          </View>
        ))}
        <Pressable
          onPress={() => setIsOpen(true)}
          className="flex-row items-center justify-center gap-1.5 rounded-xl border border-outline-100 bg-background-0 px-3 py-3"
        >
          <Icon as={AddIcon} size="sm" className="text-typography-700" />
          {/* <Text className="text-sm font-bold text-typography-900">
            {selectedShuttles.length > 0 ? "Add Another" : "Add Shuttle"}
          </Text> */}
          <Image
            source={require("@/assets/images/shuttlecock.png")}
            className="h-6 w-6"
            style={{ transform: [{ rotate: "45deg" }] }}
            resizeMode="contain"
          />
        </Pressable>
      </View>
      <SelectShuttleModal
        sessionId={sessionId}
        selectedShuttles={selectedShuttles}
        open={isOpen}
        onClose={handleClose}
        onSelect={handleSelect}
      />
    </Fragment>
  );
}

export const SelectShuttleModal = React.memo(function SelectShuttleModal({
  onClose,
  onSelect,
  open,
  sessionId,
  selectedShuttles,
}: {
  onClose: () => void;
  onSelect: (selected: ShuttleSelection) => void;
  open: boolean;
  sessionId: number;
  selectedShuttles: ShuttleSelection[];
}) {
  const [mode, setMode] = useState<ShuttleMode>("new");
  const [shuttleList, setShuttleList] = useState<ShuttleWithInventory[] | null>(
    [],
  );
  const [instanceList, setInstanceList] = useState<ShuttleInstance[]>([]);
  const [currentSelectedShuttle, setCurrentSelectedShuttle] = useState<
    number | null
  >(null);
  const [currentSelectedInstance, setCurrentSelectedInstance] = useState<
    number | null
  >(null);
  const [numberShuttles, setNumberShuttles] = useState("");

  // Already-selected 'reused' instances would otherwise silently no-op if picked
  // again (dedup happens where selections are merged), so exclude them here.
  const alreadyReusedIds = new Set(
    selectedShuttles
      .filter(
        (s): s is Extract<ShuttleSelection, { mode: "reused" }> =>
          s.mode === "reused",
      )
      .map((s) => s.shuttleInstanceId),
  );

  useEffect(() => {
    if (!open) return;
    fetchAllShuttlesWithInventory().then((res) => {
      const inStock = res.filter((shuttle) => shuttle.remaining > 0);
      setShuttleList(inStock);
      if (inStock.length > 0) {
        // setCurrentSelectedShuttle(inStock[0].shuttle_id);
      }
    });
    fetchShuttleInstancesBySessionId(sessionId).then((res) => {
      const selectable = res.filter(
        (instance) => !alreadyReusedIds.has(instance.shuttle_instance_id),
      );
      setInstanceList(selectable);
      if (selectable.length > 0) {
        setCurrentSelectedInstance(selectable[0].shuttle_instance_id);
      } else {
        setCurrentSelectedInstance(null);
      }
    });
  }, [open]);

  const canConfirm =
    mode === "new"
      ? currentSelectedShuttle !== null && parseInt(numberShuttles) > 0
      : mode === "reused"
        ? currentSelectedInstance !== null
        : true;

  return (
    <Modal size={"lg"} isOpen={open} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading>Select a Shuttle</Heading>
          <ModalCloseButton>
            <Icon
              as={CloseIcon}
              size="md"
              className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
            />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody scrollEnabled={false}>
          <VStack space="md">
            <HStack space="sm">
              <Button
                className="flex-1"
                variant={mode === "new" ? "solid" : "outline"}
                action={mode === "new" ? "primary" : "secondary"}
                onPress={() => setMode("new")}
              >
                <ButtonText>New</ButtonText>
              </Button>
              {alreadyReusedIds.size > 0 && (
                <Button
                  className="flex-1"
                  variant={mode === "reused" ? "solid" : "outline"}
                  action={mode === "reused" ? "primary" : "secondary"}
                  onPress={() => setMode("reused")}
                >
                  <ButtonText>Reused</ButtonText>
                </Button>
              )}
              <Button
                className="flex-1"
                variant={mode === "free" ? "solid" : "outline"}
                action={mode === "free" ? "primary" : "secondary"}
                onPress={() => setMode("free")}
              >
                <ButtonText>Free</ButtonText>
              </Button>
            </HStack>

            {mode === "new" &&
              (shuttleList && shuttleList.length > 0 ? (
                <VStack space="md">
                  <Select
                    selectedValue={
                      currentSelectedShuttle !== null
                        ? String(currentSelectedShuttle)
                        : undefined
                    }
                    onValueChange={(val) =>
                      setCurrentSelectedShuttle(parseInt(val))
                    }
                  >
                    <SelectTrigger variant="outline" size="lg">
                      <SelectInput
                        className="flex-1"
                        placeholder="Select a shuttle"
                      />
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
                  <Input variant="outline" size="lg">
                    <InputField
                      keyboardType="number-pad"
                      defaultValue={numberShuttles}
                      value={numberShuttles}
                      onChangeText={(val) => {
                        setNumberShuttles(val);
                      }}
                      placeholder="Enter number of shuttles used"
                    />
                  </Input>
                </VStack>
              ) : (
                <View>
                  <Text>You have no Shuttles recorded.</Text>
                </View>
              ))}

            {mode === "reused" && (
              <Select
                selectedValue={
                  currentSelectedInstance !== null
                    ? String(currentSelectedInstance)
                    : undefined
                }
                onValueChange={(val) =>
                  setCurrentSelectedInstance(parseInt(val))
                }
              >
                <SelectTrigger variant="outline" size="lg">
                  <SelectInput
                    className="flex-1"
                    placeholder="Select a shuttle in play"
                  />
                  <SelectIcon className="mr-3" as={ChevronDownIcon} />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    {instanceList.map((instance) => (
                      <SelectItem
                        key={instance.shuttle_instance_id}
                        label={instance.label}
                        value={String(instance.shuttle_instance_id)}
                      />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            )}

            {/* {mode === "free" && (
              <Text size="sm" className="text-typography-500">
                Attaches a free shuttle to this match — contributes $0 to the
                split.
              </Text>
            )} */}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" action="secondary" onPress={onClose}>
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button
            isDisabled={!canConfirm}
            onPress={() => {
              if (mode === "new" && currentSelectedShuttle !== null) {
                onSelect({
                  mode: "new",
                  shuttleId: currentSelectedShuttle,
                  quantity: parseInt(numberShuttles),
                });
              } else if (
                mode === "reused" &&
                currentSelectedInstance !== null
              ) {
                onSelect({
                  mode: "reused",
                  shuttleInstanceId: currentSelectedInstance,
                });
              } else if (mode === "free") {
                onSelect({ mode: "free" });
              }
              setNumberShuttles("");
              onClose();
            }}
          >
            <ButtonText>Confirm</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});
