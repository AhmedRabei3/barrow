import "./market.css";
import type { Metadata } from "next";
import {
  buildListingMetadata,
  getListingOrNull,
  renderListingDetailsPage,
} from "../listingDetailsPage";

export const revalidate = 300;
export const dynamic = "force-static";

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

  return renderListingDetailsPage(item);
}

export default itemDetailsPage;
