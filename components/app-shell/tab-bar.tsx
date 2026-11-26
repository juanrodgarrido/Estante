"use client";

import { usePathname } from "next/navigation";
import { TabBarView } from "./tab-bar-view";

export function TabBar({ badges }: { badges?: Partial<Record<string, number>> }) {
  return <TabBarView pathname={usePathname()} badges={badges} />;
}
