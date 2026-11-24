import { StyleSheet } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

/** خلفية فيديو صامتة ومتكررة (تُحمَّل فقط في شاشة التفاصيل لتوفير البطارية) */
export function VideoBg({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} />;
}
