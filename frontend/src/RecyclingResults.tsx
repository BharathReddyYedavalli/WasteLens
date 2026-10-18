import { useMemo, useState } from "react";
import { AlertCircle, BatteryCharging, Building2, LocateFixed, MapPin, Recycle } from "lucide-react";
import MapPanel from "./MapPanel";
import type { FacilitySearchResponse } from "./types";

type Props = {
  results: FacilitySearchResponse | null;
  selected: string | null;
  onSelect: (id: string) => void;
};

type Filter = "all" | "centers" | "drop_off";

export default function RecyclingResults({ results, selected, onSelect }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(() => results
    ? results.facilities.filter(place => filter === "all" ||
        (filter === "centers" ? place.kind === "center" : place.kind === "drop_off"))
    : [], [results, filter]);
  const viewData = useMemo(() => results ? {...results, facilities:filtered} : null, [results, filtered]);
  if (!results || !viewData) return null;

  const isUnavailable = results.listing_status === "unavailable";
  const active = filtered.some(place => place.id === selected) ? selected : null;
  const centers = results.facilities.filter(place => place.kind === "center").length;
  const dropoffs = results.facilities.length - centers;

  return <div className="free-map-shell" aria-label="Nearby recycling locations">
    <div className="map-summary">
      <div className="map-summary-loc">
        <div className="map-summary-icon"><MapPin size={19}/></div>
        <div>
          <span className="eyebrow">RECYCLE NEAR YOU</span>
          <h4>{results.location_label} <span className="map-zip">· {results.zip_code}</span></h4>
          <p>Searching up to ~{results.radius_miles.toFixed(0)} miles from the ZIP center · community-mapped locations</p>
        </div>
      </div>
      <div className="map-summary-stats">
        <strong>{isUnavailable ? "—" : results.facilities.length}</strong>
        <span>Mapped locations</span>
      </div>
    </div>

    {isUnavailable && <div className="map-alert" role="status"><AlertCircle size={17}/>
      <span>Recycling-location listings are temporarily unavailable, but the map can still display the ZIP area. Please retry later.</span></div>}
    <div className="map-filters" aria-label="Filter collection locations">
      <button type="button" className={filter === "all" ? "map-filter chosen" : "map-filter"}
        onClick={() => setFilter("all")}>All <span>{results.facilities.length}</span></button>
      <button type="button" className={filter === "centers" ? "map-filter chosen" : "map-filter"}
        onClick={() => setFilter("centers")}><Building2 size={14}/> Centers <span>{centers}</span></button>
      <button type="button" className={filter === "drop_off" ? "map-filter chosen" : "map-filter"}
        onClick={() => setFilter("drop_off")}><Recycle size={14}/> Drop-off points <span>{dropoffs}</span></button>
    </div>

    <div className="map-explorer">
      <div className="facility-side-panel" aria-label="Scrollable list of mapped recycling locations">
        <div className="facility-side-heading">
          <strong>{isUnavailable ? "Listings unavailable" : filtered.length ? "Nearby locations" : "No matching locations"}</strong>
          <small>Sorted by approximate distance</small>
        </div>
        {filtered.length ? filtered.map((place, i) =>
          <button key={place.id} type="button"
            className={"location-card " + (active === place.id ? "picked" : "")}
            aria-pressed={active === place.id}
            onClick={() => onSelect(place.id)}>
            <span className="location-index">{i + 1}</span>
            <span className="location-info">
              <strong>{place.name}</strong>
              <small>{place.address}</small>
              <span className="location-meta"><LocateFixed size={13}/> {place.distance_miles.toFixed(1)} miles · {place.kind === "center" ? "Recycling center" : "Drop-off point"}</span>
              {place.tagged_materials.length > 0 && <span className="location-tags">
                <BatteryCharging size={12}/> OSM tags: {place.tagged_materials.slice(0,4).join(" · ")}
              </span>}
              {active === place.id && <>
                {place.phone && <span className="location-phone">Listed phone (unverified): {place.phone}</span>}
                <span className="location-caution">Confirm items accepted and hours before visiting.</span>
              </>}
            </span>
          </button>
        ) : <div className="no-map-results">
          <Recycle size={25}/>
          <strong>{isUnavailable ? "Live listings could not load" : "No matching locations returned"}</strong>
          <p>{isUnavailable ? "The ZIP map still works. Retry the search later." :
            "No locations returned within ~" + results.radius_miles.toFixed(0) + " miles. OpenStreetMap community coverage may be incomplete, and this doesn't mean recycling is unavailable."}</p>
        </div>}
      </div>
      <div className="map-visual">
        <MapPanel data={viewData} selected={active} onSelect={onSelect}/>
        <div className="map-corner-label"><span className="map-live-dot"/> Interactive map · OpenStreetMap</div>
      </div>
    </div>
    <div className="map-disclaimer">
      <AlertCircle size={15}/>
      <span>Locations come from OpenStreetMap (not a comprehensive business directory). ZIP and distances are approximate; material acceptance and operating hours are unverified. Call ahead.</span>
    </div>
  </div>;
}
