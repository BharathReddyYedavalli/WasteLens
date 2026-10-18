import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Facility, FacilitySearchResponse } from "./types";

type Props = {
  data: FacilitySearchResponse;
  selected: string | null;
  onSelect: (id: string) => void;
};

// The map, pins and facility selection all stay inside WasteLens.
export default function MapPanel({ data, selected, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).setView(
      [data.center.latitude, data.center.longitude], 11
    );
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      minZoom: 3, maxZoom: 18,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    const bounds: L.LatLngExpression[] = [
      [data.center.latitude, data.center.longitude],
    ];
    markerRef.current = new Map();
    data.facilities.forEach((place: Facility) => {
      const marker = L.marker(
        [place.latitude, place.longitude],
        { icon: L.divIcon({ className: "facility-pin-container", html: '<span class="facility-pin"></span>', iconSize: [24, 30], iconAnchor: [12, 30] }) }
      ).addTo(map);
      marker.bindTooltip(place.name, { direction: "top" });
      marker.on("click", () => onSelect(place.id));
      markerRef.current.set(place.id, marker);
      bounds.push([place.latitude, place.longitude]);
    });
    if (data.facilities.length) map.fitBounds(L.latLngBounds(bounds), { padding: [38, 38], maxZoom: 12 });
    const delayed = window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      window.clearTimeout(delayed);
      map.remove();
      mapRef.current = null;
      markerRef.current.clear();
    };
  }, [data, onSelect]);

  useEffect(() => {
    if (!selected) return;
    const place = data.facilities.find(item => item.id === selected);
    if (place && mapRef.current) {
      mapRef.current.panTo([place.latitude, place.longitude]);
      markerRef.current.get(selected)?.openTooltip();
    }
  }, [selected, data.facilities]);

  return <div ref={container} className="embedded-map" role="region"
    aria-label={"Interactive recycling location map near " + data.location_label}/>;
}
