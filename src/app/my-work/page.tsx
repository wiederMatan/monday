import type { Metadata } from "next";
import { ClientPage } from "@/components/app/ClientPage";
import { MyWorkScreen } from "@/components/mywork/MyWorkScreen";

export const metadata: Metadata = { title: "My work · monday" };

export default function MyWorkPage() {
  return (
    <ClientPage>
      <MyWorkScreen />
    </ClientPage>
  );
}
