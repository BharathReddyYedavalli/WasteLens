import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FacilitySearchResponse } from "./types";

type Props = {
  data: FacilitySearchResponse;
  selected: string | null;
  onSelect: (id: string) => void;
};

/** Leaflet map with real OSM points, in-page selections and rich detail popups. */
export default function MapPanel({ data, selected, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: false,
    }).setView([data.center.latitude, data.center.longitude], 11);
    mapRef.current = map;
    L.control.zoom({position: "bottomright"}).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      minZoom: 3,
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const center = L.latLng(data.center.latitude, data.center.longitude);
    L.circle(center, {
      radius: 1000, color: "#27895b", fillColor: "#39a671",
      fillOpacity: 0.07, weight: 1, dashArray: "5 5",
    }).addTo(map);
    L.marker(center, {
      icon: L.divIcon({
        className: "zip-center-icon",
        html: '<div class="zip-center-dot"></div>',
        iconSize: [20, 20], iconAnchor: [10, 10],
      }),
      zIndexOffset: 200,
    }).addTo(map).bindTooltip("Approximate ZIP center");

    const bounds: L.LatLngExpression[] = [[center.lat, center.lng]];
    const markers = new Map<string, L.Marker>();
    data.facilities.forEach(place => {
      const marker = L.marker([place.latitude, place.longitude], {
        icon: L.divIcon({
          className: "recycle-marker-wrap",
          html: '<span class="recycle-marker"><span></span></span>',
          iconSize: [32, 43], iconAnchor: [16, 40], popupAnchor: [0, -39],
        }),
      }).addTo(map);

      // Text content rather than HTML injection: community-supplied place
      // names, addresses and phone numbers may contain arbitrary characters.
      const popup = document.createElement("div");
      popup.className = "map-popup-content";
      const title = document.createElement("strong");
      title.textContent = place.name;
      const address = document.createElement("p");
      address.textContent = place.address;
      const kind = document.createElement("small");
      kind.textContent = (place.kind === "center" ? "Center · " : "Drop-off · ") +
        place.distance_miles.toFixed(1) + " mi from ZIP center";
      popup.append(title, address, kind);
      if (place.tagged_materials.length) {
        const tags = document.createElement("p");
        tags.textContent = "OSM tags: " + place.tagged_materials.join(", ");
        popup.append(tags);
      }
      if (place.phone) {
        const phone = document.createElement("p");
        phone.textContent = "Unverified phone: " + place.phone;
        popup.append(phone);
      }
      if (place.listing_source === "official") {
        const source = document.createElement("p");
        source.textContent = "Published on an official city website.";
        popup.append(source);
      }
      if (place.access_note) {
        const access = document.createElement("p");
        access.textContent = place.access_note;
        popup.append(access);
      }
      if (place.coordinate_note) {
        const coordinate = document.createElement("small");
        coordinate.textContent = place.coordinate_note;
        popup.append(coordinate);
      }
      if (place.source_url && place.source_url.startsWith("https://")) {
        const link = document.createElement("a");
        link.href = place.source_url;
        link.textContent = place.listing_source === "official" ? "City details" : "OpenStreetMap record";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        popup.append(link);
      }
      const caution = document.createElement("p");
      caution.className = "map-popup-caution";
      caution.textContent = "Call to confirm this item is accepted.";
      popup.append(caution);

      marker.bindPopup(popup, {maxWidth: 290});
      marker.on("click", () => onSelect(place.id));
      markers.set(place.id, marker);
      bounds.push([place.latitude, place.longitude]);
    });
    markerRef.current = markers;
    if (data.facilities.length) {
      map.fitBounds(L.latLngBounds(bounds), {padding: [42, 42], maxZoom: 12});
    } else {
      map.setView(center, 11);
    }

    const resize = new ResizeObserver(() => map.invalidateSize({pan: false}));
    resize.observe(container.current);
    const delayed = window.setTimeout(() => map.invalidateSize({pan: false}), 120);
    return () => {
      window.clearTimeout(delayed);
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current.clear();
    };
  }, [data, onSelect]);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    const place = data.facilities.find(x => x.id === selected);
    if (!place) return;
    const marker = markerRef.current.get(selected);
    mapRef.current.flyTo([place.latitude, place.longitude], Math.max(12, mapRef.current.getZoom()), {
      animate: true, duration: 0.6,
    });
    marker?.openPopup();
  }, [selected, data]);

  return <div ref={container} className="embedded-map modern-map" role="region"
    aria-label={"Interactive recycling finder map near " + data.location_label}/>;
}
