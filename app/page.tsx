import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function Home() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("dota-user");
  if (userCookie?.value) {
    redirect("/lobby");
  }
  return <LoginForm />;
}
