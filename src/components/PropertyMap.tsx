import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

type PropertyMapProps = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  title?: string;
  height?: string;
  zoom?: number;
};

const DEFAULT_LATITUDE = 26.8467;
const DEFAULT_LONGITUDE = 80.9462;

export function PropertyMap({
  latitude,
  longitude,
  title = "Property location",
  height = "360px",
  zoom = 16,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const lat =
        typeof latitude === "number" && Number.isFinite(latitude) ? latitude : DEFAULT_LATITUDE;
      const lng =
        typeof longitude === "number" && Number.isFinite(longitude) ? longitude : DEFAULT_LONGITUDE;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: latitude != null && longitude != null ? zoom : 12,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(title);

      mapRef.current = map;
      markerRef.current = marker;

      // Leaflet maps inside responsive/grid containers sometimes calculate
      // their dimensions before the container has painted.
      requestAnimationFrame(() => map.invalidateSize());
      window.setTimeout(() => map.invalidateSize(), 150);
    };

    void init();

    return () => {
      cancelled = true;
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (
      !map ||
      !marker ||
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], zoom);
    map.invalidateSize();
  }, [latitude, longitude, zoom]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border border-border"
      style={{ height }}
      aria-label={`Map showing ${title}`}
    />
  );
}
