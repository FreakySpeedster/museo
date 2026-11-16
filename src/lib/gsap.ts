"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const registered = { scrollTrigger: false, flip: false, split: false };

/** Register ScrollTrigger on first use so marketing pages that only need a tween don't pay upfront. */
export function ensureScrollTrigger() {
  if (!registered.scrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    registered.scrollTrigger = true;
  }
  return ScrollTrigger;
}

export function ensureFlip() {
  if (!registered.flip) {
    gsap.registerPlugin(Flip);
    registered.flip = true;
  }
  return Flip;
}

export function ensureSplitText() {
  if (!registered.split) {
    gsap.registerPlugin(SplitText);
    registered.split = true;
  }
  return SplitText;
}

export { gsap, ScrollTrigger, Flip, useGSAP };

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canHover(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
