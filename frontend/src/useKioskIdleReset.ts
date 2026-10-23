import { useEffect, useRef, useState } from "react";

/* Kiosk-only shared-device safety. All timers are removed on unmount.
   Reset after two minutes; show a warning 20 seconds beforehand.
   Do not log events or store session data. */
export const KIOSK_IDLE_MS=120_000;
export const KIOSK_WARNING_MS=20_000;

export function useKioskIdleReset(onReset:()=>void) {
  const reset=useRef(onReset);
  reset.current=onReset;
  const [warning,setWarning]=useState(false);
  const restartRef=useRef<()=>void>(()=>{});

  useEffect(()=>{
    let warningTimer:ReturnType<typeof setTimeout>|undefined;
    let resetTimer:ReturnType<typeof setTimeout>|undefined;
    function arm(){
      if(warningTimer!==undefined)clearTimeout(warningTimer);
      if(resetTimer!==undefined)clearTimeout(resetTimer);
      setWarning(false);
      warningTimer=setTimeout(()=>setWarning(true),KIOSK_IDLE_MS-KIOSK_WARNING_MS);
      resetTimer=setTimeout(()=>{
        setWarning(false);
        reset.current();
        arm();
      },KIOSK_IDLE_MS);
    }
    restartRef.current=arm;
    const activity=()=>arm();
    const hidden=()=>{if(document.visibilityState==="hidden"){setWarning(false);reset.current();arm();}};
    const events=["pointerdown","keydown","touchstart","wheel"] as const;
    events.forEach(event=>window.addEventListener(event,activity,{passive:true}));
    document.addEventListener("visibilitychange",hidden);
    arm();
    return()=>{
      if(warningTimer!==undefined)clearTimeout(warningTimer);
      if(resetTimer!==undefined)clearTimeout(resetTimer);
      events.forEach(event=>window.removeEventListener(event,activity));
      document.removeEventListener("visibilitychange",hidden);
      restartRef.current=()=>{};
    };
  },[]);

  return {warning,extendSession:()=>restartRef.current()};
}
