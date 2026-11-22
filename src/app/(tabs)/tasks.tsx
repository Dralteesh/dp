import { Redirect } from "expo-router";

/** المهام صارت داخل التقويم (قسم «المهام»). هذا المسار القديم يحوّل إليه. */
export default function TasksRoute() {
  return <Redirect href={{ pathname: "/calendar", params: { section: "tasks" } }} />;
}
