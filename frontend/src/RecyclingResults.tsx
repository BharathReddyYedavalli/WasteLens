import MapPanel from "./MapPanel";
import type { FacilitySearchResponse } from "./types";

export type MapsConfig = { configured: boolean; embed_key: string };

type Props = {
  zip: string;
  config: MapsConfig | null;
  results: FacilitySearchResponse | null;
  selected: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
};

function GoogleMapsFrame({ zip, apiKey, searchTerm }: { zip: string; apiKey: string; searchTerm: string }) {
  // Embed Search accepts a human-readable query containing a ZIP code, so it
  // does not depend on a separately maintained ZIP/lat-lon directory.
  const q = `${searchTerm.trim() || "recycling centers"} near ${zip}, United States`;
  const params = new URLSearchParams({ key: apiKey, q });
  const src = "https://www.google.com/maps/embed/v1/search?" + params.toString();
  return <iframe className="google-embedded-map"
    title={`Google Maps search for ${q}`}
    src={src} loading="lazy" allowFullScreen
    referrerPolicy="strict-origin-when-cross-origin"/>;
}

export default function RecyclingResults({ zip, config, results, selected, onSelect, searchTerm }: Props) {
  const validZip = /^\d{5}$/.test(zip);
  if (!validZip) return null;
  const google = Boolean(config?.configured && config.embed_key);
  if (!google && !results) return <div className="google-map-setup">
    This ZIP wasn't found by the community mapping service, or its data isn't available right now.
    Google Maps' built-in search can be enabled with a separate Maps Embed API key.
    A map listing never guarantees an item is accepted.
  </div>;
  if (google && !results) return <div className="google-map-only">
    <GoogleMapsFrame zip={zip} apiKey={config!.embed_key} searchTerm={searchTerm}/>
    <p className="google-map-note" style={{padding:"0 15px"}}>
      Google Maps search results appear inside the map. Contact a location to verify item acceptance.
    </p>
  </div>;
  if (!results) return null;
  return <div className="recycling-map-results">
    {google && <p className="google-map-note">Google Maps markers and the community-mapped locations listed here use different data sources, so their results may differ. Select a Google Maps result inside the map itself.</p>}
    <div className="map-search-results">
      <div className="facility-list" aria-label="Independently mapped recycling locations">
        <h4>{results.facilities.length} community-mapped locations near {results.location_label}</h4>
        {results.facilities.length === 0 && <p>No community locations returned. Google may still show additional matches.</p>}
        {results.facilities.map(place => <button key={place.id} type="button"
          className={"facility-item "+(selected === place.id ? "selected" : "")}
          onClick={() => onSelect(place.id)}>
          <strong>{place.name}</strong>
          <span>{place.address}</span>
          <span>{place.distance_miles.toFixed(1)} mi from approximate ZIP center</span>
          {place.tagged_materials.length > 0 && <span>Community tags: {place.tagged_materials.join(", ")}</span>}
          {selected === place.id && <small>Acceptance and hours not verified. Call before visiting.</small>}
        </button>)}
      </div>
      {google ? <div className="google-map-frame"><GoogleMapsFrame zip={zip} apiKey={config!.embed_key} searchTerm={searchTerm}/></div>
        : <MapPanel data={results} selected={selected} onSelect={onSelect}/>}
    </div>
    <p className="google-map-note">Community listings are independently mapped; Google pins do not sync with the separate community list. Neither source verifies collection acceptance.</p>
  </div>;
}
