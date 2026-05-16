"use client";

import { useEffect } from "react";
import { markListingAsViewed } from "@/app/utils/viewedListings";

interface ViewedListingTrackerProps {
  listingId?: string | null;
}

export default function ViewedListingTracker({
  listingId,
}: ViewedListingTrackerProps) {
  useEffect(() => {
    markListingAsViewed(listingId);
  }, [listingId]);

  return null;
}
