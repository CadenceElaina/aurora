import type { Metadata } from "next";
import InfoClient from "./info-client";

export const metadata: Metadata = {
  title: "How It Works — Aurora",
  description: "Algorithm details, glossary, and design rationale for Aurora",
};

export default function InfoPage() {
  return <InfoClient />;
}
