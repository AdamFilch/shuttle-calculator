import { useAppToast } from "@/components/shared/AppToast";
import { Stepper } from "@/components/session/match/Stepper";
import { formatRM } from "@/services/money-display";
import { createShuttle, fetchShuttleStock, isShuttleNameTaken } from "@/services/shuttle";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CloseIcon, Icon } from "../ui/icon";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "../ui/modal";
import { fieldForError, ShuttleField, ShuttleFieldKey } from "./field";

const DUPLICATE = "A shuttle with this name already exists";

export function AddShuttleModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useAppToast();
  const [name, setName] = useState("");
  const [perTube, setPerTube] = useState("12");
  const [tubePrice, setTubePrice] = useState("");
  const [tubes, setTubes] = useState(1);
  const [nameCheck, setNameCheck] = useState({ name: "", taken: false });
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<ShuttleFieldKey, string>>>({});
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const taken = nameCheck.taken && nameCheck.name === trimmed;

  useEffect(() => {
    if (open) {
      fetchShuttleStock()
        .then((stock) => setExistingNames(stock.types.map((t) => t.name)))
        .catch(() => undefined);
    }
  }, [open]);

  useEffect(() => {
    let current = true;
    if (!trimmed) return;
    isShuttleNameTaken(trimmed)
      .then((taken) => current && setNameCheck({ name: trimmed, taken }))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [trimmed]);

  const perTubeNum = Number(perTube);
  const priceNum = Number(tubePrice);
  const perTubeValid = Number.isInteger(perTubeNum) && perTubeNum >= 1;
  const priceValid = tubePrice.trim() !== "" && priceNum > 0;
  const canSave = trimmed.length > 0 && !taken && perTubeValid && priceValid && !saving;
  const existingName =
    existingNames.find((n) => n.trim().toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
  const nameError = taken ? DUPLICATE : errors.name;

  function handleClose() {
    setName("");
    setPerTube("12");
    setTubePrice("");
    setTubes(1);
    setErrors({});
    onClose();
  }

  async function onClickSave() {
    if (!canSave) return;
    setErrors({});
    setSaving(true);
    try {
      await createShuttle({ name: trimmed, tube_price: priceNum, per_tube: perTubeNum, tubes });
      handleClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const field = fieldForError(message);
      if (field) setErrors({ [field]: message });
      else toast.show("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={handleClose}>
      <ModalBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
      <ModalContent className="w-[92%] rounded-2xl border-0 bg-surface-raised p-5 shadow-modal">
        <ModalHeader className="items-center">
          <Text className="text-modal-title font-semibold text-ink">Add shuttle</Text>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="-mr-2 h-[44px] w-[44px] items-center justify-center"
          >
            <Icon as={CloseIcon} size="lg" className="text-muted" />
          </Pressable>
        </ModalHeader>
        <ModalBody className="mb-0">
          <View className="gap-3">
            <ShuttleField
              label="Name"
              value={name}
              maxLength={20}
              onChangeText={(v) => {
                setName(v);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Yonex AS-50"
              error={nameError}
              testID="add-shuttle-name"
            />
            <ShuttleField
              label="Shuttles per tube"
              value={perTube}
              keyboardType="number-pad"
              onChangeText={setPerTube}
              error={errors.perTube}
              testID="add-shuttle-per-tube"
            />
            <ShuttleField
              label="Tube price"
              prefix="RM"
              value={tubePrice}
              keyboardType="decimal-pad"
              onChangeText={setTubePrice}
              placeholder="0.00"
              error={errors.price}
              testID="add-shuttle-price"
            />
            <View className="gap-1">
              <Text className="text-caption text-muted">Tubes bought</Text>
              <Stepper label="Tubes" value={tubes} onChange={setTubes} min={1} />
            </View>
            <View className="rounded-lg bg-surface px-3 py-2.5" testID="add-shuttle-preview">
              {perTubeValid && priceValid ? (
                <Text className="text-body text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                  <Text className="font-semibold text-ink">{formatRM(Math.round((priceNum / perTubeNum) * 100) / 100)}</Text>
                  {" per shuttle · "}
                  <Text className="font-semibold text-ink">{perTubeNum * tubes}</Text>
                  {" shuttles"}
                </Text>
              ) : (
                <Text className="text-body text-muted">Enter the tube price to see the price per shuttle.</Text>
              )}
            </View>
          </View>
        </ModalBody>
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            className="min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-85"
          >
            <Text className="text-body font-medium text-ink">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onClickSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            testID="add-shuttle-save"
            className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${canSave ? "bg-primary active:opacity-85" : "bg-disabled"}`}
          >
            <Text className={`text-body font-medium ${canSave ? "text-surface" : "text-muted"}`}>Add shuttle</Text>
          </Pressable>
        </View>
        {taken ? (
          <Text className="mt-3 text-caption text-muted" testID="add-shuttle-dup-hint">
            To add stock to {existingName}, open it from the list and use Buy again.
          </Text>
        ) : null}
      </ModalContent>
    </Modal>
  );
}
