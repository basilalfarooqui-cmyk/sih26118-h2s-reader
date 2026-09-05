import { useMemo, useRef, useState } from "react";
import { View, Image, StyleSheet, PanResponder, LayoutChangeEvent } from "react-native";
import type { CropRegion } from "../utils/pixelColor";

type Corner = "tl" | "tr" | "bl" | "br";

interface Props {
  photoUri: string;
  photoWidth: number;
  photoHeight: number;
  initialRegion: CropRegion;
  onChange: (region: CropRegion) => void;
}

const HANDLE_SIZE = 28;
const HANDLE_HIT_SLOP = { top: 16, bottom: 16, left: 16, right: 16 };

export default function CropAdjuster({
  photoUri,
  photoWidth,
  photoHeight,
  initialRegion,
  onChange,
}: Props) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [box, setBox] = useState({
    left: initialRegion.originX,
    top: initialRegion.originY,
    right: initialRegion.originX + initialRegion.width,
    bottom: initialRegion.originY + initialRegion.height,
  });
  const boxRef = useRef(box);
  boxRef.current = box;
  const startBoxRef = useRef(box);

  const minSize = Math.max(12, Math.round(Math.min(photoWidth, photoHeight) * 0.03));

  const layout = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return null;
    const scale = Math.min(
      containerSize.width / photoWidth,
      containerSize.height / photoHeight
    );
    const renderedWidth = photoWidth * scale;
    const renderedHeight = photoHeight * scale;
    return {
      scale,
      offsetX: (containerSize.width - renderedWidth) / 2,
      offsetY: (containerSize.height - renderedHeight) / 2,
      renderedWidth,
      renderedHeight,
    };
  }, [containerSize, photoWidth, photoHeight]);

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }

  function updateBox(next: typeof box) {
    setBox(next);
    onChange({
      originX: Math.round(next.left),
      originY: Math.round(next.top),
      width: Math.round(next.right - next.left),
      height: Math.round(next.bottom - next.top),
    });
  }

  function makeResponder(corner: Corner) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        if (!layout) return;
        const dx = gesture.dx / layout.scale;
        const dy = gesture.dy / layout.scale;
        const start = startBoxRef.current;
        let { left, top, right, bottom } = start;

        if (corner === "tl") {
          left = clamp(start.left + dx, 0, right - minSize);
          top = clamp(start.top + dy, 0, bottom - minSize);
        } else if (corner === "tr") {
          right = clamp(start.right + dx, left + minSize, photoWidth);
          top = clamp(start.top + dy, 0, bottom - minSize);
        } else if (corner === "bl") {
          left = clamp(start.left + dx, 0, right - minSize);
          bottom = clamp(start.bottom + dy, top + minSize, photoHeight);
        } else {
          right = clamp(start.right + dx, left + minSize, photoWidth);
          bottom = clamp(start.bottom + dy, top + minSize, photoHeight);
        }

        updateBox({ left, top, right, bottom });
      },
      onPanResponderGrant: () => {
        startBoxRef.current = boxRef.current;
      },
    });
  }

  const responders = useMemo(
    () => ({
      tl: makeResponder("tl"),
      tr: makeResponder("tr"),
      bl: makeResponder("bl"),
      br: makeResponder("br"),
    }),
    [layout, minSize, photoWidth, photoHeight]
  );

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  const screenRect = layout
    ? {
        left: layout.offsetX + box.left * layout.scale,
        top: layout.offsetY + box.top * layout.scale,
        width: (box.right - box.left) * layout.scale,
        height: (box.bottom - box.top) * layout.scale,
      }
    : null;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Image
        source={{ uri: photoUri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
      />

      {screenRect && layout && (
        <>
          {/* Dim everything outside the selected box */}
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              { left: layout.offsetX, top: layout.offsetY, width: layout.renderedWidth, height: screenRect.top - layout.offsetY },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              {
                left: layout.offsetX,
                top: screenRect.top + screenRect.height,
                width: layout.renderedWidth,
                height: layout.offsetY + layout.renderedHeight - (screenRect.top + screenRect.height),
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              { left: layout.offsetX, top: screenRect.top, width: screenRect.left - layout.offsetX, height: screenRect.height },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              {
                left: screenRect.left + screenRect.width,
                top: screenRect.top,
                width: layout.offsetX + layout.renderedWidth - (screenRect.left + screenRect.width),
                height: screenRect.height,
              },
            ]}
          />

          <View pointerEvents="none" style={[styles.boxBorder, screenRect]} />

          {(["tl", "tr", "bl", "br"] as Corner[]).map((corner) => {
            const cx =
              corner === "tl" || corner === "bl" ? screenRect.left : screenRect.left + screenRect.width;
            const cy =
              corner === "tl" || corner === "tr" ? screenRect.top : screenRect.top + screenRect.height;
            return (
              <View
                key={corner}
                {...responders[corner].panHandlers}
                hitSlop={HANDLE_HIT_SLOP}
                style={[
                  styles.handle,
                  { left: cx - HANDLE_SIZE / 2, top: cy - HANDLE_SIZE / 2 },
                ]}
              />
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  dim: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  boxBorder: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
  },
  handle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: "#2563eb",
    borderWidth: 3,
    borderColor: "#fff",
  },
});
