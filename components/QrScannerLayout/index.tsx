import { View } from "react-native-ui-lib";
import { StyleSheet } from "react-native";
import Svg, { Defs, G, Mask, Path, Rect } from "react-native-svg";
import { useEffect, useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface QrScannerLayoutProps {
  scanning?: boolean;
}

/**
 * Main QrScannerLayout component implementation
 * Creates a dynamic overlay with responsive positioning and visual indicators
 */
const QrScannerLayout = ({ scanning = false }: QrScannerLayoutProps) => {

  /**
   * Width state for dynamic layout calculations
   * Updated when the component measures its container dimensions
   * Used for centering the scanning area horizontally
   */
  const [width, setWidth] = useState<number>(0);
  
  /**
   * Height state for dynamic layout calculations
   * Updated when the component measures its container dimensions
   * Used for positioning the scanning area vertically (upper third of screen)
   */
  const [height, setHeight] = useState(0);
  const line = useSharedValue(0);
  const frameSize = Math.min(Math.max(width * 0.72, 220), 290);
  const frameX = width / 2 - frameSize / 2;
  const frameY = height * 0.38 - frameSize / 2;
  const borderRadius = 20;

  useEffect(() => {
    line.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [line]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: frameY + frameSize * 0.2 + line.value * (frameSize * 0.6),
    opacity: scanning ? 0.95 : 0.5,
  }));

  return (
    <View
      pointerEvents="none"
      style={styles.layout}
      onLayout={(event) => {

        /**
         * Layout event handler for responsive positioning
         * 
         * This handler is triggered whenever the component's layout changes
         * (initial render, orientation change, etc.). It captures the actual
         * dimensions of the container and updates state for precise positioning
         * of the scanning area and corner indicators.
         */
        setWidth(event.nativeEvent.layout.width);
        setHeight(event.nativeEvent.layout.height);
      }}
    >
      <Svg height="100%" width="100%">
        <Defs>
          <Mask id="mask" x="0" y="0" height="100%" width="100%">
            <Rect height="100%" width="100%" fill="white" opacity={0.74} />
            <Rect
              x={frameX}
              y={frameY}
              rx={borderRadius}
              ry={borderRadius}
              width={frameSize}
              height={frameSize}
              fillOpacity={0}
            />
          </Mask>
        </Defs>
        <Rect height="100%" width="100%" mask="url(#mask)" fill="#000000" />
        <G
          id={"group"}
          x={frameX - 8}
          y={frameY - 8}
          scale={frameSize / 250}
        >
          <Path
            d="M206.98 12.7185H230.184C232.472 12.7185 234.327 14.4434 234.327 16.5712V38.1555"
            stroke="#00E676"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
          />
          <Path
            d="M206.98 235.282H230.184C232.472 235.282 234.327 233.557 234.327 231.429V209.845"
            stroke="#00E676"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
          />
          <Path
            d="M41.0204 12.7185H17.8155C15.5279 12.7185 13.6735 14.4434 13.6735 16.5712V38.1555"
            stroke="#00E676"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
          />
          <Path
            d="M41.0204 235.282H17.8155C15.5279 235.282 13.6735 233.557 13.6735 231.429V209.845"
            stroke="#00E676"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
          />
        </G>
      </Svg>
      <Animated.View
        style={[
          styles.scanLine,
{ left: frameX + 8, width: frameSize - 32 },
          scanLineStyle,
        ]}
      />
    </View>
  );
};

/**
 * StyleSheet for QrScannerLayout component
 * 
 * Implements absolute positioning overlay styling for camera preview integration:
 * - Full screen coverage for complete overlay functionality
 * - Absolute positioning for layering over camera preview
 * - High z-index for proper stacking order
 * - Transparent background to allow camera preview visibility
 * 
 * Design Principles:
 * - Non-intrusive overlay that enhances rather than obscures
 * - Proper layering for camera integration
 * - Full screen utilization for immersive scanning experience
 * - Performance-optimized positioning for smooth camera operation
 */
const styles = StyleSheet.create({
  layout: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 2,
  },
  scanLine: {
    position: "absolute",
    height: 3,
    backgroundColor: "#00E676",
    shadowColor: "#00E676",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default QrScannerLayout;
