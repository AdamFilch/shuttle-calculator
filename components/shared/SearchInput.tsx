import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input"
import { SearchIcon } from "@/components/ui/icon"

export function SearchInput({
    value,
    onChangeText,
    placeholder,
}: {
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string
}) {
    return (
        <Input variant="outline" size="md" className="rounded-lg border-border bg-surface-raised">
            <InputSlot className="pl-3">
                <InputIcon as={SearchIcon} className="text-muted" />
            </InputSlot>
            <InputField
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                className="text-body text-ink placeholder:text-muted"
            />
        </Input>
    )
}
