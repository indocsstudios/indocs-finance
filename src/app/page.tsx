import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
export default function HomePage() {
  redirect(getSession() ? "/dashboard" : "/login");
}
