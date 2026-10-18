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
  const isPartial = results.listing_status === "partial";
  const active = filtered.some(place => place.id === selected) ? selected : null;
  const centers = results.facilities.filter(place => place.kind === "center").length;
  const dropoffs = results.facilities.length - centers;

  return <div className="free-map-shell" aria-label="Nearby recycling locations">
    <div className="map-summary">
      <div className="map-summary-loc">
        <div className="map-summary-icon"><MapPin size={19}/></div>
        <div>
          <h4>{results.location_label} <span className="map-zip">· {results.zip_code}</span></h4>
          <p>Within {results.radius_miles.toFixed(0)} miles</p>
        </div>
      </div>
      <div className="map-summary-stats">
        <strong>{isUnavailable ? "…" : results.facilities.length}</strong>
        <span>places found</span>
      </div>
    </div>

    {isPartial && <div className="map-alert" role="status"><AlertCircle size={17}/>
      <span>{isPartial ? "Some listings are offline. Showing city locations." : "Places aren't loading. Try again shortly."}</span></div>}
    {results.facilities.length > 0 && <div className="map-filters" aria-label="Filter collection locations">
      <button type="button" className={filter === "all" ? "map-filter chosen" : "map-filter"}
        onClick={() => setFilter("all")}>All <span>{results.facilities.length}</span></button>
      <button type="button" className={filter === "centers" ? "map-filter chosen" : "map-filter"}
        onClick={() => setFilter("centers")}><Building2 size={14}/> Centers <span>{centers}</span></button>
      <button type="button" className={filter === "drop_off" ? "map-filter chosen" : "map-filter"}
        onClick={() => setFilter("drop_off")}><Recycle size={14}/> Drop off spots <span>{dropoffs}</span></button>
    </div>}

    <div className="map-explorer">
      <div className="facility-side-panel" aria-label="Scrollable list of mapped recycling locations">
        <div className="facility-side-heading">
          <strong>{filtered.length ? "Places near you" : isUnavailable ? "Can't load places" : "No places found"}</strong>
          
        </div>
        {filtered.length ? filtered.map((place, i) =>
          <div key={place.id} className="location-entry">
          <button type="button"
            className={"location-card " + (active === place.id ? "picked" : "")}
            aria-pressed={active === place.id}
            onClick={() => onSelect(place.id)}>
            <span className="location-index">{i + 1}</span>
            <span className="location-info">
              <strong>{place.name}</strong>
              <small>{place.address}</small>
              <span className="location-meta"><LocateFixed size={13}/> {place.distance_miles.toFixed(1)} miles · {place.kind === "center" ? "Recycling center" : "Drop off spot"}</span>
              {place.listing_source === "official" && <span className="official-source-tag">City published location</span>}
              {place.tagged_materials.length > 0 && <span className="location-tags">
                <BatteryCharging size={12}/> {place.listing_source === "official" ? "Listed materials:" : "OSM tags:"} {place.tagged_materials.slice(0,4).join(" · ")}
              </span>}
              {active === place.id && <>
                {place.phone && <span className="location-phone">Phone: {place.phone}</span>}
                {place.access_note && <span className="location-caution">{place.access_note}</span>}
                {place.coordinate_note && <span className="location-caution">{place.coordinate_note}</span>}
                
              </>}
            </span>
          </button>
          {active === place.id && place.source_url && <a className="facility-official-link" href={place.source_url} target="_blank" rel="noopener noreferrer">View {place.listing_source === "official" ? "city details" : "map record"}</a>}
          </div>
        ) : <div className="no-map-results">
          <Recycle size={25}/>
          <strong>{isUnavailable ? "Can't load places right now" : "No places on this map yet"}</strong>
          <p>{isUnavailable ? "The map still works. Please try again soon." :
            "We couldn't find a listed location nearby. There may still be recycling options in your area."}</p>
        </div>}
      </div>
      <div className="map-visual">
        <MapPanel data={viewData} selected={active} onSelect={onSelect}/>
        
      </div>
    </div>
    <details className="map-visit-info">
      <summary>Before you go</summary>
      <p>Call to check whether the facility takes your item, its hours and any residency rules. Map locations may be approximate. Listings come from OpenStreetMap and city websites.</p>
    </details>
  </div>;
}
