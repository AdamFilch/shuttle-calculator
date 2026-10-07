import Svg, { Circle, Path } from "react-native-svg"

export function TrophyGlyph({ colour, size = 16 }: { colour: string, size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colour} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M8 21h8M12 17v4M7 4h10M17 4v8a5 5 0 0 1-10 0V4" />
            <Circle cx={5} cy={9} r={2} />
            <Circle cx={19} cy={9} r={2} />
        </Svg>
    )
}
