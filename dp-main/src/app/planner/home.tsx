import { Redirect } from "expo-router";

// شاشة مؤرشفة في _archive/planner-home؛ تحويل للرئيسية
export default function Archived() {
  return <Redirect href="/" />;
}
