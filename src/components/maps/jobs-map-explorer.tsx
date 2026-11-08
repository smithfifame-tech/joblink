"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const JobsMapExplorer = dynamic(() => import("./jobs-map-explorer-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-[60dvh] min-h-[380px] w-full rounded-2xl" />,
});
