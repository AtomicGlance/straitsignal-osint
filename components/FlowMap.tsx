"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IntelSnapshot } from "../lib/intel";

type FlowMapProps = {
  tanker: IntelSnapshot["tanker"];
  selected: string;
  onSelect: (id: string) => void;
};

function ageLabel(minutes: number | null) {
  if (minutes === null) return "no timestamp";
  if (minutes < 1) return "<1m old";
  if (minutes < 60) return `${Math.round(minutes)}m old`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h old`;
  return `${Math.round(minutes / 1440)}d old`;
}

function escapeText(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function FlowMap({ tanker, selected, onSelect }: FlowMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  const feedStateRef = useRef(tanker.feedState);
  const [mapError, setMapError] = useState<string | null>(null);

  const vesselData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: tanker.positions.map((vessel) => ({
        type: "Feature" as const,
        properties: {
          id: vessel.id,
          mmsi: vessel.mmsi,
          name: vessel.name,
          speed: vessel.speed,
          heading: vessel.heading,
          updatedAt: vessel.updatedAt,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [vessel.lon, vessel.lat],
        },
      })),
    }),
    [tanker.positions],
  );

  const chokepointData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: tanker.chokepoints.map((point) => ({
        type: "Feature" as const,
        properties: {
          id: point.id,
          name: point.name,
          risk: point.risk,
          selected: point.id === selected ? 1 : 0,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [point.lon, point.lat],
        },
      })),
    }),
    [selected, tanker.chokepoints],
  );
  const vesselDataRef = useRef(vesselData);
  const chokepointDataRef = useRef(chokepointData);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/fiord",
      center: [22, 19],
      zoom: 1.35,
      minZoom: 1,
      maxZoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "OpenFreeMap · OpenStreetMap",
      }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource("tankers", {
        type: "geojson",
        data: vesselDataRef.current,
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 42,
      });
      map.addLayer({
        id: "tanker-clusters",
        type: "circle",
        source: "tankers",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": feedStateRef.current === "live" ? "#31d3c5" : "#f6b94a",
          "circle-opacity": 0.82,
          "circle-radius": ["step", ["get", "point_count"], 14, 100, 19, 500, 25],
          "circle-stroke-color": "#07111d",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "tanker-cluster-count",
        type: "symbol",
        source: "tankers",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 10,
          "text-font": ["Noto Sans Regular"],
        },
        paint: { "text-color": "#06121e" },
      });
      map.addLayer({
        id: "tankers-unclustered",
        type: "circle",
        source: "tankers",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": feedStateRef.current === "live" ? "#31d3c5" : "#f6b94a",
          "circle-radius": 4,
          "circle-stroke-color": "#07111d",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });
      map.addSource("chokepoints", {
        type: "geojson",
        data: chokepointDataRef.current,
      });
      map.addLayer({
        id: "chokepoint-halo",
        type: "circle",
        source: "chokepoints",
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 12, 8],
          "circle-color": [
            "match",
            ["get", "risk"],
            "high",
            "#ff6d73",
            "watch",
            "#f6b94a",
            "#31d3c5",
          ],
          "circle-opacity": 0.24,
          "circle-stroke-color": [
            "match",
            ["get", "risk"],
            "high",
            "#ff6d73",
            "watch",
            "#f6b94a",
            "#31d3c5",
          ],
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "chokepoint-label",
        type: "symbol",
        source: "chokepoints",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 1.45],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#d9e7ef",
          "text-halo-color": "#06121e",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "tanker-clusters", async (event) => {
        const feature = event.features?.[0];
        const clusterId = Number(feature?.properties?.cluster_id);
        const source = map.getSource("tankers") as maplibregl.GeoJSONSource;
        if (!Number.isFinite(clusterId) || !feature?.geometry || feature.geometry.type !== "Point") {
          return;
        }
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
        });
      });

      map.on("click", "tankers-unclustered", (event) => {
        const feature = event.features?.[0];
        if (!feature?.geometry || feature.geometry.type !== "Point") return;
        const properties = feature.properties ?? {};
        const speed =
          properties.speed === null || properties.speed === undefined
            ? "unknown"
            : `${Number(properties.speed).toFixed(1)} kn`;
        new maplibregl.Popup({ closeButton: false, offset: 9 })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(
            `<strong>${escapeText(properties.name || "Unnamed tanker")}</strong>` +
              `<span>MMSI ${escapeText(properties.mmsi)} · ${escapeText(speed)}</span>` +
              `<small>Position ${escapeText(properties.updatedAt)}</small>`,
          )
          .addTo(map);
      });

      const selectChokepoint = (event: maplibregl.MapMouseEvent) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: ["chokepoint-halo", "chokepoint-label"],
        })[0];
        const id = feature?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      };
      map.on("click", "chokepoint-halo", selectChokepoint);
      map.on("click", "chokepoint-label", selectChokepoint);

      for (const layer of [
        "tanker-clusters",
        "tankers-unclustered",
        "chokepoint-halo",
        "chokepoint-label",
      ]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    map.on("error", (event) => {
      const message = event.error?.message ?? "";
      if (/style|source|tile|network|fetch/i.test(message)) {
        setMapError("Basemap tiles could not be loaded. Vessel coordinates remain available through the API.");
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    vesselDataRef.current = vesselData;
    chokepointDataRef.current = chokepointData;
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("tankers") as maplibregl.GeoJSONSource | undefined)?.setData(vesselData);
    (map.getSource("chokepoints") as maplibregl.GeoJSONSource | undefined)?.setData(
      chokepointData,
    );
  }, [chokepointData, vesselData]);

  useEffect(() => {
    feedStateRef.current = tanker.feedState;
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const color = tanker.feedState === "live" ? "#31d3c5" : "#f6b94a";
    if (map.getLayer("tanker-clusters")) {
      map.setPaintProperty("tanker-clusters", "circle-color", color);
    }
    if (map.getLayer("tankers-unclustered")) {
      map.setPaintProperty("tankers-unclustered", "circle-color", color);
    }
  }, [tanker.feedState]);

  return (
    <div className="flow-map">
      <div
        ref={containerRef}
        className="flow-map__canvas"
        role="application"
        aria-label={`World map with ${tanker.positions.length} latest available tanker positions`}
      />
      <div className={`map-feed map-feed--${tanker.feedState}`}>
        <SourceMarker state={tanker.feedState} />
        <div>
          <strong>
            {tanker.feedState === "live" ? "LIVE AIS" : "LATEST AVAILABLE AIS"}
          </strong>
          <span>
            {tanker.provider} · {ageLabel(tanker.ageMinutes)}
          </span>
        </div>
      </div>
      <div className="map-count">
        <strong>{tanker.positions.length.toLocaleString()}</strong>
        <span>mapped tanker positions</span>
      </div>
      {tanker.positions.length === 0 && (
        <div className="map-empty">
          <strong>No vessel coordinates loaded</strong>
          <span>Connect a tanker feed or refresh the public fallback.</span>
        </div>
      )}
      {mapError && <div className="map-error">{mapError}</div>}
    </div>
  );
}

function SourceMarker({ state }: { state: IntelSnapshot["tanker"]["feedState"] }) {
  return <span className={`map-feed__dot map-feed__dot--${state}`} aria-hidden="true" />;
}
