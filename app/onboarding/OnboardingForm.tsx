"use client";

import { useRouter } from "next/navigation";
import { BusinessForm } from "@/components/app/BusinessForm";

export function OnboardingForm() {
  const router = useRouter();
  return (
    <BusinessForm
      mode="create"
      onDone={() => {
        router.replace("/app");
        router.refresh();
      }}
    />
  );
}
