import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LobbyPage from "@/components/LobbyPage";

export default async function Lobby() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("dota-user");
  if (!userCookie?.value) redirect("/");
  const user = JSON.parse(userCookie.value);

  const history = await fetch("http://localhost:3000/api/history", { cache: "no-store" })
    .then((r) => r.json())
    .catch(() => []);

  return <LobbyPage user={user} history={history} />;
}
