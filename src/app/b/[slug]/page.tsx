import type { Metadata } from "next";
import BarrioApp from "@/components/app/BarrioApp";

export const metadata: Metadata = { title: "Calendario del barrio" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BarrioApp slug={slug} />;
}
