"use client";

import { useEffect, useRef, useState } from "react";
import {
  geocoding,
  type BBox,
  type GeocodingFeature,
  type GeocodingPlaceType,
  type Position,
} from "@maptiler/client";

export const MAP_GEOCODING_TYPES: GeocodingPlaceType[] = [
  "address",
  "road",
  "place",
  "neighbourhood",
  "locality",
  "municipal_district",
  "municipality",
];
export const MAP_GEOCODING_MIN_QUERY_LENGTH = 3;

type GeocodingSearchStatus = "idle" | "loading" | "success" | "error";

type UseGeocodingSearchOptions = {
  query: string;
  bbox?: BBox;
  countryCode?: string | null;
  proximity?: Position | "ip";
  enabled?: boolean;
  minLength?: number;
  debounceMs?: number;
  limit?: number;
};

export function useGeocodingSearch({
  query,
  bbox,
  countryCode,
  proximity,
  enabled = true,
  minLength = MAP_GEOCODING_MIN_QUERY_LENGTH,
  debounceMs = 250,
  limit = 5,
}: UseGeocodingSearchOptions) {
  const [features, setFeatures] = useState<GeocodingFeature[]>([]);
  const [status, setStatus] = useState<GeocodingSearchStatus>("idle");
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!enabled || trimmedQuery.length < minLength) {
      setFeatures([]);
      setStatus("idle");
      return;
    }

    setFeatures([]);
    setStatus("loading");

    let cancelled = false;

    const timeout = window.setTimeout(() => {
      const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

      if (!apiKey) {
        if (!cancelled && requestIdRef.current === requestId) {
          setFeatures([]);
          setStatus("error");
        }
        return;
      }

      void geocoding
        .forward(trimmedQuery, {
          apiKey,
          autocomplete: true,
          bbox,
          country: countryCode ? [countryCode] : undefined,
          fuzzyMatch: true,
          limit,
          proximity,
          types: MAP_GEOCODING_TYPES,
        })
        .then(async (result) => {
          if (
            result.features.length > 0 ||
            !bbox ||
            cancelled ||
            requestIdRef.current !== requestId
          ) {
            return result;
          }

          return geocoding.forward(trimmedQuery, {
            apiKey,
            autocomplete: true,
            country: countryCode ? [countryCode] : undefined,
            fuzzyMatch: true,
            limit,
            proximity,
            types: MAP_GEOCODING_TYPES,
          });
        })
        .then((result) => {
          if (cancelled || requestIdRef.current !== requestId) return;

          setFeatures(result.features);
          setStatus("success");
        })
        .catch((error) => {
          if (cancelled || requestIdRef.current !== requestId) return;

          console.warn("Could not search MapTiler geocoding:", error);
          setFeatures([]);
          setStatus("error");
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1;
      }
      window.clearTimeout(timeout);
    };
  }, [
    bbox,
    countryCode,
    debounceMs,
    enabled,
    limit,
    minLength,
    proximity,
    query,
  ]);

  return {
    features,
    isError: status === "error",
    isLoading: status === "loading",
    isReady: status === "success",
    status,
  };
}
