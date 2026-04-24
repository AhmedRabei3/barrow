import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  const { id, slug } = await params;
  const item = await getListingOrNull(id);

  if (item?.canonicalPath) {
    const canonicalSlug = item.canonicalPath.split("/").pop();
    if (canonicalSlug && canonicalSlug !== slug) {
      redirect(item.canonicalPath);
    }
  }

  return renderListingDetailsPage(item);
}
