import "./market.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  buildListingMetadata,
  getListingOrNull,
  renderListingDetailsPage,
} from "../listingDetailsPage";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getListingOrNull(id);

  return buildListingMetadata(id, item);
}

async function itemDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getListingOrNull(id);

  if (item?.canonicalPath) {
    redirect(item.canonicalPath);
  }

  return renderListingDetailsPage(item);
}

export default itemDetailsPage;
