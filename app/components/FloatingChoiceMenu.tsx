"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Portals choice menus out of the Planning Desk's overflow-y:auto container.
 * The popup can never be clipped by the mini desk; it flips or scrolls within
 * the available viewport and stays anchored during scrolling and resize. */
export default function FloatingChoiceMenu({
  open, triggerRef, onDismiss, id, label, className="", children,
}:{
  open:boolean; triggerRef:RefObject<HTMLElement|null>; onDismiss:()=>void;
  id:string; label:string; className?:string; children:ReactNode;
}){
  const menuRef=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    if(!open) return;
    const menu=menuRef.current;
    const trigger=triggerRef.current;
    if(!menu||!trigger) return;
    function place(){
      const anchor=trigger!.getBoundingClientRect();
      const vpWidth=window.innerWidth, vpHeight=window.innerHeight;
      const pad=8, gap=5;
      const width=Math.min(menu!.offsetWidth || 232,vpWidth-pad*2);
      const desired=Math.max(menu!.scrollHeight,menu!.offsetHeight);
      const down=vpHeight-pad-anchor.bottom-gap;
      const up=anchor.top-pad-gap;
      const flip=down < desired && up>down;
      const space=Math.max(72,flip?up:down);
      const height=Math.min(desired,space,vpHeight-pad*2);
      const top=flip ? anchor.top-gap-height:anchor.bottom+gap;
      const left=Math.max(pad,Math.min(vpWidth-pad-width,anchor.right-width));
      Object.assign(menu!.style,{
        left:left+"px",top:Math.max(pad,top)+"px",
        maxHeight:Math.max(72,height)+"px",maxWidth:(vpWidth-pad*2)+"px",
        visibility:"visible",
      });
    }
    place();
    // capture=true includes scrolling in nested desks, not just window scroll.
    window.addEventListener("scroll",place,true);
    window.addEventListener("resize",place);
    const observer=typeof ResizeObserver!=="undefined"?
      new ResizeObserver(place):null;
    observer?.observe(menu);
    return()=>{
      window.removeEventListener("scroll",place,true);
      window.removeEventListener("resize",place);
      observer?.disconnect();
    };
  },[open,triggerRef]);
  useEffect(()=>{
    if(!open) return;
    const outside=(event:PointerEvent)=>{
      if(!triggerRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)) onDismiss();
    };
    const escape=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        onDismiss();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return()=>{
      document.removeEventListener("pointerdown",outside);
      document.removeEventListener("keydown",escape);
    };
  },[open,onDismiss,triggerRef]);
  return open && typeof document!=="undefined" ? createPortal(
    <div ref={menuRef} id={id}
      className={"priority-control-popover floating-choice-menu "+className}
      role="group" aria-label={label}
      style={{position:"fixed",zIndex:10020,visibility:"hidden",
        right:"auto",bottom:"auto",top:0,left:0,
        maxHeight:"calc(100vh - 16px)",overflowY:"auto",overscrollBehavior:"contain"}}
      onClick={event=>event.stopPropagation()}>
      {children}
    </div>,document.body
  ):null;
}
