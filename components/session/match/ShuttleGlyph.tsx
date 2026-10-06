import Svg, { Circle, Path } from "react-native-svg"

export function ShuttleGlyph({ colour, size = 16 }: { colour: string, size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={colour}>
            <Path d="M8 1.5L12.5 10h-9z" />
            <Circle cx={8} cy={12.5} r={2.2} />
        </Svg>
    )
}
