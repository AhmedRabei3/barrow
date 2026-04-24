import type { Metadata } from "next";
import {
  buildListingMetadata,
  getListingOrNull,
  renderListingDetailsPage,
} from "../../listingDetailsPage";

interface PageProps {
  params: Promise<{
    id: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getListingOrNull(id);

  return buildListingMetadata(id, item);
}

export default async function ListingDetailsSlugPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getListingOrNull(id);

  return renderListingDetailsPage(item);
}
