import { useState } from "react";
import { ExternalLink, MapPin, Search } from "lucide-react";
import type { ItemAnalysis } from "./types";

export default function FinderView({ scan }: { scan: ItemAnalysis | null }) {
  const [zip, setZip] = useState("");
  const [material, setMaterial] = useState("");
  const [searched, setSearched] = useState(false);
  const query = (material.trim() || scan?.collection_search_term || "recycling drop-off center").trim();
  const location = zip.trim();
  const mapsUrl = location
    ? "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(query + " near " + location)
    : "";
  return <section className="finder-screen">
    <span className="eyebrow">FIND COLLECTION OPTIONS</span>
    <h1><MapPin size={29}/> Recycling Finder</h1>
    <p>Look for nearby collection options by ZIP code or city, including special handling for batteries and electronics.</p>
    <div className="finder-card">
      <form onSubmit={event => {event.preventDefault();if(location) setSearched(true);}} className="finder-form">
        <label htmlFor="finder-zip">ZIP code or city</label>
        <input id="finder-zip" placeholder="e.g. 75035 or Frisco, TX"
          maxLength={90} required value={zip}
          onChange={event => {setZip(event.target.value);setSearched(false);}} />
        <label htmlFor="finder-item">What do you need to recycle?</label>
        <input id="finder-item" maxLength={95} value={material}
          onChange={event => {setMaterial(event.target.value);setSearched(false);}}
          placeholder={scan?.collection_search_term || "e.g. lithium-ion battery drop-off"} />
        <button className="button primary" type="submit"><Search size={16}/> Prepare Google Maps search</button>
      </form>
      {searched && mapsUrl && <div className="finder-outcome">
        <p>Find possible collection facilities for <strong>{query}</strong> near <strong>{location}</strong>:</p>
        <a className="button primary" href={mapsUrl} target="_blank" rel="noreferrer">
          Open Google Maps <ExternalLink size={15}/>
        </a>
        <p><strong>Important:</strong> Google Maps returns possible matches, not verified material acceptance. Contact any facility before bringing your item.</p>
      </div>}
      <p className="finder-note">No location permission or Google Maps API key is needed for this search link. In a later version we can build an embedded map with verified material acceptance where reliable data exists.</p>
    </div>
  </section>;
}
