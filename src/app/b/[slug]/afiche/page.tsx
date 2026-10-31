import type { Metadata } from "next";
import Afiche from "@/components/app/Afiche";

export const metadata: Metadata = { title: "Afiche del barrio", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Afiche slug={slug} />;
}
