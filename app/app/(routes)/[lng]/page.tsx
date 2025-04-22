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

import { type FC, memo } from "react";
import type { TRootPageProps } from "@/app/pages/rootPage/types";
import "./RootPage.scss";
import { useNavigator } from "@/app/shared/hooks";
import { openLocationManagerSettings } from '@telegram-apps/sdk';

const RootPageComponent: FC<TRootPageProps> = (props) => {
  const { requestLocation, locationManager: lmState, ...locationData } = useNavigator({ lng: props.lng });

  return (
    <div>
      <div>navigator: {JSON.stringify(locationData, null, 2)}</div>
      <div>locationManager: {JSON.stringify(lmState, null, 2)}</div>
      <div>
        <button onClick={requestLocation}>Request Location</button>
      </div>
      {lmState.isSupported && !lmState.isAvailable && (
         <button onClick={() => {
            if (openLocationManagerSettings.isAvailable()) {
               try {
                  openLocationManagerSettings();
               } catch (err) {
                  console.error("Failed to open settings:", err);
               }
            }
         }}>Open Location Settings</button>
      )}
    </div>
  )
};

RootPageComponent.displayName = "RootPage";

export const RootPage = memo(RootPageComponent);
