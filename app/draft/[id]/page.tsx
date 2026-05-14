import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DraftRoom from "@/components/DraftRoom";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("dota-user");
  if (!userCookie?.value) redirect("/");
  const user = JSON.parse(userCookie.value);
  return <DraftRoom sessionId={id} user={user} />;
}
