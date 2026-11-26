"use client";

import { usePathname } from "next/navigation";
import { TabBarView } from "./tab-bar-view";

export function TabBar() {
  return <TabBarView pathname={usePathname()} />;
}
