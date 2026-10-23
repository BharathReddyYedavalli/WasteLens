import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin, Recycle } from "lucide-react";
import type { FacilitySearchResponse } from "./types";
import { useLanguage } from "./i18n";
import { loadGoogleMaps } from "./googleMapsLoader";

type GooglePlace = {
  id: string; name: string; address: string;
  location: {lat: number; lng: number}; distance: number; url: string;
};

type Props = {
  data: FacilitySearchResponse;
  apiKey: string;
  onFallback: () => void;
};

const radians = (degrees: number) => degrees * Math.PI / 180;
function milesBetween(a: {lat:number;lng:number}, b: {lat:number;lng:number}) {
  const dLat = radians(b.lat-a.lat);
  const dLng = radians(b.lng-a.lng);
  const value = Math.sin(dLat/2)**2 +
    Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLng/2)**2;
  return 3958.76 * 2 * Math.asin(Math.min(1,Math.sqrt(value)));
}

/** Google Maps + Places only. Never display Google Places data on the OSM fallback. */
export default function GooglePlacesFinder({data, apiKey, onFallback}: Props) {
  const {t}=useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map|null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const infoRef = useRef<google.maps.InfoWindow|null>(null);
  const [places,setPlaces]=useState<GooglePlace[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    const markers: google.maps.marker.AdvancedMarkerElement[]=[];
    setLoading(true);
    setPlaces([]);
    setSelected(null);
    const center = {lat:data.center.latitude,lng:data.center.longitude};
    async function start() {
      try {
        await loadGoogleMaps(apiKey);
        const [{Map:GoogleMap,InfoWindow},{AdvancedMarkerElement},{Place}]=await Promise.all([
          google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
          google.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>,
        ]);
        // Restrict to a nearby rectangle. A listing is NOT proof the facility
        // accepts the scanned material or is open to this particular visitor.
        const latOffset = Math.min(0.85,data.radius_miles/69);
        const lonOffset = Math.min(1.1,data.radius_miles/Math.max(10,69*Math.cos(radians(center.lat))));
        const bounds=new google.maps.LatLngBounds(
          {lat:center.lat-latOffset,lng:center.lng-lonOffset},
          {lat:center.lat+latOffset,lng:center.lng+lonOffset},
        );
        const found=await Place.searchByText({
          textQuery:"recycling centers",
          fields:["id","displayName","formattedAddress","location","googleMapsURI","businessStatus"],
          locationRestriction:bounds,
          region:"us",
          maxResultCount:20,
        });
        if(!active)return;
        const matched: GooglePlace[] = found.places
          .filter(place=>place.location && place.businessStatus!=="CLOSED_PERMANENTLY")
          .map((place,i)=>{
            const point={lat:place.location!.lat(),lng:place.location!.lng()};
            return {
              id:place.id||"google-result-"+i,
              name:place.displayName||"Recycling location",
              address:place.formattedAddress||"Address unavailable",
              location:point,
              distance:milesBetween(center,point),
              url:place.googleMapsURI||"",
            };
          })
          .sort((a,b)=>a.distance-b.distance);
        if(!matched.length||!container.current){onFallback();return;}
        const map = new GoogleMap(container.current,{
          center,zoom:11,mapId:"DEMO_MAP_ID",mapTypeControl:false,
          fullscreenControl:false,streetViewControl:false,
          clickableIcons:false,
        });
        mapRef.current=map;
        const info=new InfoWindow();
        infoRef.current=info;
        const visibleBounds=new google.maps.LatLngBounds();
        visibleBounds.extend(center);
        for (const place of matched) {
          const marker = new AdvancedMarkerElement({
            map,position:place.location,title:place.name,gmpClickable:true,
          });
          marker.addListener("click",()=>setSelected(place.id));
          markers.push(marker);
          markersRef.current.set(place.id,marker);
          visibleBounds.extend(place.location);
        }
        map.fitBounds(visibleBounds,45);
        setPlaces(matched);
        setLoading(false);
      } catch {
        // API disabled, demo quota exceeded, network blocked, or invalid key:
        // retain the existing working Leaflet/OSM experience.
        if(active)onFallback();
      }
    }
    void start();
    return ()=>{
      active=false;
      markers.forEach(marker=>{marker.map=null;google.maps.event.clearInstanceListeners(marker);});
      markersRef.current.clear();
      if(mapRef.current)google.maps.event.clearInstanceListeners(mapRef.current);
      infoRef.current?.close();
      infoRef.current=null;
      mapRef.current=null;
    };
  },[apiKey,data.zip_code,data.center.latitude,data.center.longitude,data.radius_miles,onFallback]);

  useEffect(()=>{
    if(!selected || !mapRef.current || !infoRef.current)return;
    const place=places.find(item=>item.id===selected);
    const marker=markersRef.current.get(selected);
    if(!place||!marker)return;
    mapRef.current.panTo(place.location);
    const card=document.createElement("div");
    card.className="google-place-popup";
    const title=document.createElement("strong");
    title.textContent=place.name;
    const address=document.createElement("p");
    address.textContent=place.address;
    const warning=document.createElement("p");
    warning.textContent=t("Call to confirm this item is accepted.");
    card.append(title,address,warning);
    infoRef.current.setContent(card);
    infoRef.current.open({map:mapRef.current,anchor:marker,shouldFocus:false});
  },[selected,places,t]);

  return <div className="free-map-shell google-places-shell" aria-label={t("Nearby recycling locations")}>
    <div className="map-summary">
      <div className="map-summary-loc">
        <div className="map-summary-icon"><MapPin size={19}/></div>
        <div><h4>{data.location_label} <span className="map-zip">· {data.zip_code}</span></h4>
          <p>{t("Google Maps nearby recycling locations")}</p></div>
      </div>
      <div className="map-summary-stats"><strong>{loading?"…":places.length}</strong>
        <span>{t("places found")}</span></div>
    </div>
    <div className="map-explorer">
      <div className="facility-side-panel" aria-label={t("Scrollable list of mapped recycling locations")}>
        <div className="facility-side-heading"><strong>{loading?t("Finding nearby places…"):t("Places near you")}</strong></div>
        {loading?<div className="no-map-results"><Recycle size={24}/><p>{t("Finding nearby places…")}</p></div>:
        places.map((place,i)=><div key={place.id} className="location-entry">
          <button type="button" className={"location-card "+(selected===place.id?"picked":"")}
            aria-pressed={selected===place.id} onClick={()=>setSelected(place.id)}>
            <span className="location-index">{i+1}</span>
            <span className="location-info">
              <strong>{place.name}</strong><small>{place.address}</small>
              <span className="location-meta"><MapPin size={13}/>{place.distance.toFixed(1)} {t("miles")} · Google Maps</span>
            </span>
          </button>
          {place.url.startsWith("https://")&&<a className="facility-official-link"
            href={place.url} target="_blank" rel="noopener noreferrer">
            {t("View on Google Maps")} <ExternalLink size={14}/>
          </a>}
        </div>)}
      </div>
      <div className="map-visual">
        <div ref={container} className="embedded-map modern-map google-map-canvas"
          role="region" aria-label={t("Interactive recycling finder map near")+" "+data.location_label}/>
      </div>
    </div>
    <p className="google-map-caution">{t("These places may not accept your specific item. Check with each location before visiting.")}</p>
    <button type="button" className="google-map-fallback" onClick={onFallback}>
      {t("Use community map instead")}
    </button>
  </div>;
}
