"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import MapPicker from "../components/modals/mapPicker/MapPickerModal";

type ListingAlert = {
  id: string;
  itemType: string | null;
  sellOrRent: string | null;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastMatchAt: string | null;
  category?: {
    name?: string | null;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
};

type EditFormState = {
  id: string;
  radiusKm: string;
  lat: string;
  lng: string;
  itemType: string;
  sellOrRent: string;
  categoryName: string;
  isEnabled: boolean;
};

export default function ListingAlertsPage() {
  const { data: session, status } = useSession();
  const [alerts, setAlerts] = useState<ListingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAlert, setEditingAlert] = useState<ListingAlert | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const closeEditModal = useCallback(() => {
    setEditingAlert(null);
    setEditForm(null);
  }, []);

  const openEditModal = useCallback((alert: ListingAlert) => {
    setEditingAlert(alert);
    setEditForm({
      id: alert.id,
      radiusKm: String(alert.radiusKm),
      lat: String(alert.centerLat),
      lng: String(alert.centerLng),
      itemType: alert.itemType ?? "",
      sellOrRent: alert.sellOrRent ?? "",
      categoryName:
        alert.category?.nameAr ||
        alert.category?.nameEn ||
        alert.category?.name ||
        "",
      isEnabled: alert.isEnabled,
    });
    setMessage(null);
  }, []);

  const updateEditForm = useCallback((patch: Partial<EditFormState>) => {
    setEditForm((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const applyPickedLocation = useCallback(
    (location: { lat: number; lng: number }) => {
      updateEditForm({ lat: String(location.lat), lng: String(location.lng) });
    },
    [updateEditForm],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editForm) return;

    setSavingEdit(true);
    setMessage(null);

    try {
      const res = await fetch("/api/listing-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          radiusKm: Number(editForm.radiusKm),
          lat: Number(editForm.lat),
          lng: Number(editForm.lng),
          itemType: editForm.itemType || null,
          action: editForm.sellOrRent || null,
          catName: editForm.categoryName.trim() || null,
          isEnabled: editForm.isEnabled,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        throw new Error(data.message || "Failed to update alert");
      }

      const updatedAlert: ListingAlert = {
        ...(editingAlert as ListingAlert),
        radiusKm: Number(editForm.radiusKm),
        centerLat: Number(editForm.lat),
        centerLng: Number(editForm.lng),
        itemType: editForm.itemType || null,
        sellOrRent: editForm.sellOrRent || null,
        isEnabled: editForm.isEnabled,
        updatedAt: new Date().toISOString(),
        category:
          editForm.categoryName.trim().length > 0
            ? {
                name: editForm.categoryName.trim(),
                nameAr: editForm.categoryName.trim(),
                nameEn: editForm.categoryName.trim(),
              }
            : null,
      };

      setAlerts((current) =>
        current.map((alert) =>
          alert.id === updatedAlert.id ? updatedAlert : alert,
        ),
      );
      setMessage(data.message || "Alert updated");
      closeEditModal();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update the alert",
      );
    } finally {
      setSavingEdit(false);
    }
  }, [closeEditModal, editForm, editingAlert]);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    const loadAlerts = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/listing-alerts", {
          headers: { Accept: "application/json" },
        });
        const json = (await res.json()) as { data?: ListingAlert[] };
        setAlerts(json.data ?? []);
      } catch {
        setMessage("Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };

    void loadAlerts();
  }, [status]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/listing-alerts?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        throw new Error("Failed to delete alert");
      }
      setAlerts((current) => current.filter((alert) => alert.id !== id));
      setMessage("Alert deleted");
    } catch {
      setMessage("Could not delete the alert");
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading") {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Listing alerts
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Sign in to manage your saved location alerts.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Saved Alerts
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Manage alerts for your chosen location, radius, category, and item
              type.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:text-slate-200"
          >
            Back to search
          </Link>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700/50 dark:bg-blue-900/20 dark:text-blue-300">
            {message}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">
              No saved alerts yet.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {alert.category?.nameAr ||
                        alert.category?.nameEn ||
                        alert.category?.name ||
                        alert.itemType ||
                        "Alert"}
                    </div>
                    <div>
                      Radius: {alert.radiusKm} km · Status:{" "}
                      {alert.isEnabled ? "Enabled" : "Disabled"}
                    </div>
                    <div>
                      Location: {alert.centerLat.toFixed(4)},{" "}
                      {alert.centerLng.toFixed(4)}
                    </div>
                    {alert.sellOrRent && <div>Action: {alert.sellOrRent}</div>}
                    <div>
                      Updated: {new Date(alert.updatedAt).toLocaleString()}
                    </div>
                    {alert.lastMatchAt && (
                      <div>
                        Last match:{" "}
                        {new Date(alert.lastMatchAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 self-start sm:flex-row">
                    <button
                      type="button"
                      onClick={() => openEditModal(alert)}
                      className="inline-flex rounded-full border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(alert.id)}
                      disabled={deletingId === alert.id}
                      className="inline-flex rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      {deletingId === alert.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingAlert && editForm && (
        <div className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Edit alert
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update the radius, category, type, or pick a new location on
                  the map.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-700 dark:text-slate-300">
                      Radius (km)
                    </span>
                    <input
                      value={editForm.radiusKm}
                      onChange={(e) =>
                        updateEditForm({ radiusKm: e.target.value })
                      }
                      type="number"
                      min="1"
                      max="250"
                      step="1"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-700 dark:text-slate-300">
                      Category
                    </span>
                    <input
                      value={editForm.categoryName}
                      onChange={(e) =>
                        updateEditForm({ categoryName: e.target.value })
                      }
                      type="text"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      placeholder="e.g. Homes, Cars"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-700 dark:text-slate-300">
                      Item type
                    </span>
                    <select
                      value={editForm.itemType}
                      onChange={(e) =>
                        updateEditForm({ itemType: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">All types</option>
                      <option value="PROPERTY">PROPERTY</option>
                      <option value="NEW_CAR">NEW_CAR</option>
                      <option value="USED_CAR">USED_CAR</option>
                      <option value="HOME_FURNITURE">HOME_FURNITURE</option>
                      <option value="MEDICAL_DEVICE">MEDICAL_DEVICE</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-700 dark:text-slate-300">
                      Action
                    </span>
                    <select
                      value={editForm.sellOrRent}
                      onChange={(e) =>
                        updateEditForm({ sellOrRent: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">Any</option>
                      <option value="SELL">SELL</option>
                      <option value="RENT">RENT</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-700 dark:text-slate-300">
                      Latitude
                    </span>
                    <input
                      value={editForm.lat}
                      onChange={(e) => updateEditForm({ lat: e.target.value })}
                      type="number"
                      step="0.000001"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-700 dark:text-slate-300">
                      Longitude
                    </span>
                    <input
                      value={editForm.lng}
                      onChange={(e) => updateEditForm({ lng: e.target.value })}
                      type="number"
                      step="0.000001"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    checked={editForm.isEnabled}
                    onChange={(e) =>
                      updateEditForm({ isEnabled: e.target.checked })
                    }
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Enable alert
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingEdit ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/30">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pick location on map
                </div>
                <MapPicker
                  radius={Number(editForm.radiusKm) * 1000 || 1000}
                  initialCenter={
                    Number.isFinite(Number(editForm.lat)) &&
                    Number.isFinite(Number(editForm.lng))
                      ? [Number(editForm.lat), Number(editForm.lng)]
                      : undefined
                  }
                  onLocationSelect={applyPickedLocation}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tap on the map to update the saved alert center point.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
