/*
✨ CoonDev • http://dev.coonlink.fun/ 

 ▄█▄    ████▄ ████▄    ▄   ██▄   ▄███▄      ▄  
 █▀ ▀▄  █   █ █   █     █  █  █  █▀   ▀      █ 
 █   ▀  █   █ █   █ ██   █ █   █ ██▄▄   █     █
 █▄  ▄▀ ▀████ ▀████ █ █  █ █  █  █▄   ▄▀ █    █
 ▀███▀              █  █ █ ███▀  ▀███▀    █  █ 
                    █   ██                 █▐  
                                           ▐   
*/
"use client";

import isNil from "lodash/isNil";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { locationManager, openLocationManagerSettings } from '@telegram-apps/sdk';

type TPosition = {
  countryCode?: string;
  countryName?: string;
  city?: string;
  errorPosition?: unknown;
  isCoords: boolean;
  latitude?: number;
  longitude?: number;
};

type TLocationManagerState = {
  isSupported: boolean;
  isAvailable: boolean;
  hasRequestedLocation: boolean;
  mountAttempted: boolean;
  mountIsAvailable: boolean;
};

export type TUseNavigatorResponse = TPosition & {
  locationManager: TLocationManagerState;
  requestLocation: () => void;
};

type TProps = {
  lng: string;
};

type TUseNavigator = (props: TProps) => TUseNavigatorResponse;

export const useNavigator: TUseNavigator = ({ lng }) => {
  const { t } = useTranslation("index");
  const [position, setPosition] = useState<TPosition>({
    countryCode: undefined,
    countryName: undefined,
    city: undefined,
    errorPosition: undefined,
    isCoords: false,
    longitude: undefined,
    latitude: undefined,
  });

  const [locationManagerState, setLocationManagerState] = useState<TLocationManagerState>({
    isSupported: false,
    isAvailable: false,
    hasRequestedLocation: false,
    mountAttempted: false,
    mountIsAvailable: false,
  });

  const getLocationFromCoords = useCallback(async ({
                                         longitude,
                                         latitude,
                                       }: {
    longitude?: number;
    latitude?: number;
  }) => {
    if (!longitude && !latitude) return undefined;
    try {
      const url = `${process.env.NEXT_PUBLIC_DOMAIN_GET_LOCATION}/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_API_KEY}&geocode=${longitude},${latitude}&format=json&lang=${lng}`;
      const res = await fetch(url);
      const data = await res.json();
      const countryName: string =
        data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
          ?.metaDataProperty?.GeocoderMetaData?.AddressDetails?.Country
          ?.CountryName ?? "";
      const countryCode: string = (
        data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
          ?.metaDataProperty?.GeocoderMetaData?.AddressDetails?.Country
          ?.CountryNameCode ?? ""
      ).toLowerCase();
      const city: string =
        data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
          ?.metaDataProperty?.GeocoderMetaData?.AddressDetails?.Country
          ?.AdministrativeArea?.SubAdministrativeArea?.Locality?.LocalityName ??
        data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
          ?.metaDataProperty?.GeocoderMetaData?.AddressDetails?.Country
          ?.AdministrativeArea?.AdministrativeAreaName ??
        "";
      setPosition((prevState) => ({
        ...prevState,
        countryCode,
        countryName,
        city,
        errorPosition: undefined,
        isCoords: true,
        longitude,
        latitude,
      }));
      return {};
    } catch (error) {
      console.error("getLocationFromCoords error: ", error);
      if (error instanceof Error) {
        setPosition((prevState) => ({
          ...prevState,
          errorPosition: error.message,
          isCoords: false,
        }));
      } else {
        setPosition((prevState) => ({
          ...prevState,
          errorPosition: t("errorBoundary.common.unexpectedError"),
          isCoords: false,
        }));
      }
    }
  }, [lng, t]);

  const getFromLocationManager = useCallback(async () => {
    setLocationManagerState(prev => ({ ...prev, hasRequestedLocation: true }));
    try {
      if (!locationManagerState.mountIsAvailable && locationManager.isSupported()) {
         if (!locationManagerState.mountAttempted) {
            setLocationManagerState(prev => ({ ...prev, mountAttempted: true }));
             try {
                await locationManager.mount();
                setLocationManagerState(prev => ({ ...prev, mountIsAvailable: true }));
             } catch(mountErr) {
                console.error("Failed to mount Location Manager:", mountErr);
                setLocationManagerState(prev => ({ ...prev, mountIsAvailable: false, errorPosition: 'Mount Failed' }));
                return;
             }
         } else {
            return;
         }
      }

      const isLocAvailable = locationManager.requestLocation.isAvailable();
      setLocationManagerState(prev => ({ ...prev, isAvailable: isLocAvailable }));

      if (isLocAvailable) {
        const location = await locationManager.requestLocation();
        console.log("Device Location (LocationManager):", location);
        if (!isNil(location?.longitude) && !isNil(location?.latitude)) {
           await getLocationFromCoords({
            longitude: location.longitude,
            latitude: location.latitude,
          });
        } else {
           throw new Error("Location manager returned invalid coordinates");
        }
      } else {
        console.log("Location request is not available via LocationManager.");
         setPosition(prevState => ({ ...prevState, errorPosition: "Location request not available" }));
        if (openLocationManagerSettings.isAvailable()) {
          try {
            console.log("Hint: Settings could be opened here.");
          } catch (err) {
            console.error("Failed to open location manager settings:", err);
          }
        }
      }
    } catch (err) {
      console.error("Failed to get location from LocationManager:", err);
      setPosition((prevState) => ({
        ...prevState,
        errorPosition: err instanceof Error ? err.message : String(err),
        isCoords: false,
      }));
    }
  }, [getLocationFromCoords, locationManagerState.mountAttempted, locationManagerState.mountIsAvailable]);

  const getFromNavigator = useCallback(() => {
      setLocationManagerState(prev => ({ ...prev, hasRequestedLocation: true }));
      if (!navigator?.geolocation) {
          console.error("Browser Geolocation API not available.");
          setPosition(prevState => ({ ...prevState, errorPosition: "Browser Geolocation API not available" }));
          return;
      }

      navigator.geolocation.getCurrentPosition(
      (geoPosition: GeolocationPosition) => {
        console.log("Device Location (Navigator):", geoPosition);
        if (
          !isNil(geoPosition?.coords?.longitude) &&
          !isNil(geoPosition?.coords?.latitude)
        ) {
          const longitude = geoPosition.coords.longitude;
          const latitude = geoPosition.coords.latitude;
           getLocationFromCoords({
            longitude,
            latitude,
          }).then(() => null);
        } else {
           setPosition((prevState) => ({
            ...prevState,
            errorPosition: "Navigator returned invalid coordinates",
            isCoords: false,
          }));
        }
      },
      (error: GeolocationPositionError) => {
        setPosition((prevState) => ({
          ...prevState,
          errorPosition: error.message,
          isCoords: false,
        }));
        console.error("getFromNavigator error: ", error);
      },
      {
        enableHighAccuracy: false,
      },
    );
  }, [getLocationFromCoords]);

  const requestLocation = useCallback(() => {
     const lmSupported = locationManager.isSupported();
     if (lmSupported) {
         getFromLocationManager();
     } else {
         getFromNavigator();
     }
  }, [getFromLocationManager, getFromNavigator]);

  useEffect(() => {
    const lmSupported = locationManager.isSupported();
    const lmRequestAvailable = lmSupported ? locationManager.requestLocation.isAvailable() : false;
    const lmMountAvailable = lmSupported ? locationManager.mount.isAvailable() : false;

     setLocationManagerState(prev => ({
        ...prev,
        isSupported: lmSupported,
        isAvailable: lmRequestAvailable,
        mountIsAvailable: lmMountAvailable,
     }));

    if (!position.isCoords && !locationManagerState.hasRequestedLocation) {
        requestLocation();
    }
  }, [position.isCoords, requestLocation]);

  return useMemo(() => {
    return {
      countryCode: position?.countryCode,
      countryName: position?.countryName,
      city: position?.city,
      errorPosition: position?.errorPosition,
      isCoords: position.isCoords,
      latitude: position?.latitude,
      longitude: position?.longitude,
      lng,
      locationManager: locationManagerState,
      requestLocation,
    };
  }, [lng, position, locationManagerState, requestLocation]);
};
