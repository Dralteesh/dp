// ملف الدخول المخصّص: يسجّل معالج الأدوات المصغرة ثم يشغّل Expo Router.
// يجب أن يكون "main" في package.json هو "index.ts".
import { registerWidgetTaskHandler } from "react-native-android-widget";
import { widgetTaskHandler } from "./src/widgets/widget-task-handler";

registerWidgetTaskHandler(widgetTaskHandler);

import "expo-router/entry";
