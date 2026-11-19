import { Component, memo, useMemo, useRef, type ReactNode } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber/native";
import type * as THREE from "three";
import { SceneBox } from "@/components/focus/Scene";
import { useSky } from "@/components/focus/useSky";
import { Text } from "@/components/ui/Text";
import { treeSlot } from "@/lib/focusStats";
import { SPECIES, type FocusRecord } from "@/store/useFocus";
import { Environment } from "./environment/Environment";
import { Birch, Cherry, Maple, Oak, Pine } from "./trees";
import type { GrowthRef, TreeProps } from "./utils";

/** أقصى عدد أشجار تُرسم في المشهد (الأحدث أولًا)؛ الباقي يبقى في الألبوم */
export const MAX_3D_TREES = 20;
const HEIGHT = 320;

/** نوع الشجرة في التطبيق ← الرسم ثلاثي الأبعاد */
const TREES: Record<keyof typeof SPECIES, (p: TreeProps) => ReactNode> = {
  oak: Oak,
  pine: Pine,
  olive: Maple,
  cherry: Cherry,
  cypress: Birch,
};

// مكتملة = مرحلة 3 (شجرة كاملة)، ذابلة = مرحلة 0 (نبتة صغيرة)
const GROWN: GrowthRef = { current: 3 };
const WITHERED: GrowthRef = { current: 0 };

const ROW_Z = [-3.0, -0.2, 2.6];

function place(r: FocusRecord, i: number) {
  const { x, row, jitter } = treeSlot(r.id, i, ROW_Z.length);
  let px = (x - 0.5) * 10.4;
  let pz = ROW_Z[row] + (jitter - 0.5) * 1.5;
  const rad = Math.hypot(px, pz);
  if (rad > 5.6) {
    px *= 5.6 / rad;
    pz *= 5.6 / rad;
  }
  return { position: [px, 0, pz] as [number, number, number], rotationY: jitter * 6.28, scale: 0.5 + jitter * 0.18 };
}

/** يدوّر المشهد كله نحو الزاوية المطلوبة بسلاسة */
function Rig({ angle, children }: { angle: { current: number }; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += (angle.current - g.current.rotation.y) * (1 - Math.exp(-8 * Math.min(dt, 0.05)));
  });
  return <group ref={g}>{children}</group>;
}

/** غابتي ثلاثية الأبعاد: اسحب أفقيًا للدوران، اضغط شجرة لفتح بطاقتها */
export const Forest3D = memo(function Forest3D({ records, onPick }: { records: FocusRecord[]; onPick: (r: FocusRecord) => void }) {
  const sky = useSky().now;
  const angle = useRef(0);
  const start = useRef(0);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => {
          start.current = angle.current;
        },
        onPanResponderMove: (_, g) => {
          angle.current = Math.max(-1.1, Math.min(1.1, start.current + g.dx * 0.006));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  const placed = useMemo(() => records.slice(0, MAX_3D_TREES).map((r, i) => ({ r, ...place(r, i) })), [records]);

  return (
    <SceneBox sky={sky} height={HEIGHT} ground={false}>
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        <Canvas shadows camera={{ position: [0, 5.2, 15.5], fov: 36 }} onCreated={({ camera }) => camera.lookAt(0, 1.4, 0)}>
          <Environment night={sky.night} />
          <Rig angle={angle}>
            {placed.map(({ r, position, rotationY, scale }) => {
              const Tree = TREES[r.species] ?? Oak;
              return (
                <group
                  key={r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(r);
                  }}
                >
                  <Tree growth={r.status === "grown" ? GROWN : WITHERED} position={position} rotationY={rotationY} scale={scale} />
                </group>
              );
            })}
          </Rig>
        </Canvas>
      </View>
      {records.length === 0 ? (
        <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "flex-start", paddingTop: 24 }}>
          <Text w="semi" style={{ color: "#fff" }}>
            أرضك جاهزة… ازرع أول شجرة
          </Text>
        </View>
      ) : null}
    </SceneBox>
  );
});

/** إن تعذّر تشغيل الرسم ثلاثي الأبعاد على الجهاز يُعرض المشهد القديم بدل أن يتعطل التطبيق */
export class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("Forest3D failed, using 2D fallback", e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
