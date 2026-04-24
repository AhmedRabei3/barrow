import type { Metadata } from "next";
<<<<<<< HEAD
import type { ComponentProps } from "react";
import ItemDetails from "./ItemDetails";
import { headers } from "next/headers";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import {
  attachRelatedById,
  findItemByType,
  getItemTypeById,
} from "@/app/api/items/functions/helpers";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
type ItemDetailsItem = ComponentProps<typeof ItemDetails>["item"];

const getListingTitle = (item: Awaited<ReturnType<typeof getItem>>) => {
  if (!item?.data) {
            { newCarId: id, isDeleted: false },
            { oldCarId: id, isDeleted: false },
            { propertyId: id, isDeleted: false },
            { homeFurnitureId: id, isDeleted: false },
            { medicalDeviceId: id, isDeleted: false },
            { otherItemId: id, isDeleted: false },
          ],
        },
      }),
      findItemByType(itemType, id),
      attachRelatedById(id),
    ]);

    const normalizedItemData = normalizeItemData(itemData);

    if (!normalizedItemData || !location) {
      return null;
    }

    return {
      type: itemType,
      data: normalizedItemData,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        state: location.state,
        city: location.city,
        country: location.country,
      },
      images: related.images,
      reviews: related.reviews,
      transactions: related.transactions,
    };
  } catch {
    return null;
  }
};

=======
>>>>>>> 9ca19a190630bbdc943432302796c971c88b82b8
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getListingOrNull(id);
  return buildListingMetadata(id, item);
}
}

async function itemDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getListingOrNull(id);
  if (item?.canonicalPath) {
    redirect(item.canonicalPath);
  }
  return renderListingDetailsPage(item);
}
}

export default itemDetailsPage;
