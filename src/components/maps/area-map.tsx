"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const AreaMap = dynamic(() => import("./area-map-inner"), { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> });
