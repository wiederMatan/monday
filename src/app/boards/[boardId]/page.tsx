import { ClientPage } from "@/components/app/ClientPage";
import { BoardScreen } from "@/components/board/BoardScreen";

/** Board data lives in the browser; the client screen reads the id from the URL. */
export default function BoardPage() {
  return (
    <ClientPage>
      <BoardScreen />
    </ClientPage>
  );
}
