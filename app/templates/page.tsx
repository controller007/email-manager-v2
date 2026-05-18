// app/templates/page.tsx
"use client";

import { getSession } from "@/app/_lib/auth/session";
import { redirect } from "next/navigation";
import { TemplatesManager } from "@/app/_components/templates-manager";
import { LayoutTemplate } from "lucide-react";
import DashboardLayout from "../_components/dashboard-layout";
import VisualEmailBuilder from "../_components/visual-email-builder";

export default  function TemplatesPage() {
//   const session = await getSession();
//   if (!session?.user?.id) redirect("/login");

  return <VisualEmailBuilder onSave={() => {}} onBack={() => {}} />;
}
