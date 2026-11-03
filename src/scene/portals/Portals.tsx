import { useEffect } from "react";
import { WORLDS } from "@/config/worlds";
import { markLoaded } from "@/store";
import { Portal } from "./Portal";

/** Portal management: instantiates one interactive portal per registry entry. */
export function Portals() {
  useEffect(() => {
    markLoaded("portals");
  }, []);
  return (
    <>
      {WORLDS.map((w) => (
        <Portal key={w.id} world={w} />
      ))}
    </>
  );
}
