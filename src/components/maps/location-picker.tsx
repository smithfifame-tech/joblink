"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const LocationPicker = dynamic(() => import("./location-picker-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-[340px] w-full rounded-xl" />,
});
