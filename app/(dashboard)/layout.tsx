import { Suspense } from "react";
import DashboardLayout from "../_components/dashboard-layout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}
