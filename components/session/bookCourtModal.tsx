import { bookCourt } from "@/services/court";
import { useState } from "react";
import { Button, ButtonText } from "../ui/button";
import { Heading } from "../ui/heading";
import { CloseIcon, Icon } from "../ui/icon";
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

export function BookCourtModal({
  open,
  onClose,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}) {
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("0");
  const [quantity, setQuantity] = useState("1");

  async function onClickSave() {
    const res = await bookCourt({
      sessionId: parseInt(sessionId),
      label: label || undefined,
      price: parseFloat(price),
      quantity: parseInt(quantity),
    });

    if (res) {
      setLabel("");
      setPrice("0");
      setQuantity("1");
      onClose();
    }
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
          <Heading>Book Courts</Heading>
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
              Price is per court. The total (price x quantity) is split evenly
              among the session&apos;s players when the session is closed.
            </Text>
            <Input
              variant="outline"
              size="md"
              isDisabled={false}
              isInvalid={false}
              isReadOnly={false}
            >
              <InputField
                defaultValue={label}
                value={label}
                onChangeText={(val) => {
                  setLabel(val);
                }}
                placeholder="Court label (optional)"
              />
            </Input>
            <Input
              variant="outline"
              size="md"
              isDisabled={false}
              isInvalid={false}
              isReadOnly={false}
            >
              <InputField
                defaultValue={price}
                value={price}
                onChangeText={(val) => {
                  setPrice(val);
                }}
                placeholder="Enter the price per court"
              />
            </Input>
            <Input
              variant="outline"
              size="md"
              isDisabled={false}
              isInvalid={false}
              isReadOnly={false}
            >
              <InputField
                defaultValue={quantity}
                value={quantity}
                onChangeText={(val) => {
                  setQuantity(val);
                }}
                placeholder="Enter how many courts"
                keyboardType="number-pad"
              />
            </Input>
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
              onClickSave();
            }}
          >
            <ButtonText>Book Court</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
