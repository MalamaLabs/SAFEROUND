// app/page.tsx
// investors.malamalabs.com root → send straight to the portal landing.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/investors");
}
