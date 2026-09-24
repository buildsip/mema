"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import GatewayFlow from "@/app/components/gateway";
import { docsRoute } from "@/lib/shared";

/**
 * Home hero. Title and description sit above the docs button.
 * The button's middle is the middle of the screen, navbar included.
 * The animation fills the area under the navbar, edge to edge.
 * Left lines stop at the button's left edge. Right lines stop at its right edge.
 * focusY is measured from the button, so the lines follow it.
 * buttonColor is the button fill. The lines ease into it as they get close.
 */
export default function HomePage() {
  const sectionRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [focus, setFocus] = useState({ hole: 0, focusY: 0, buttonColor: "" });

  // The lines are drawn in an iframe, so they cannot see the button.
  // Measure it here and pass the gap across. hole is the button width.
  // focusY is the button's vertical center, measured from the top of this card.
  // buttonColor is its fill, so the lines can shift toward that cream.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const button = buttonRef.current;
    if (!section || !button) return;

    const measure = () => {
      const sectionBox = section.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      const hole = Math.round(buttonBox.width);
      const focusY = Math.round(buttonBox.top - sectionBox.top + buttonBox.height / 2);
      const buttonColor = getComputedStyle(button).backgroundColor;
      setFocus((current) =>
        current.hole === hole && current.focusY === focusY && current.buttonColor === buttonColor
          ? current
          : { hole, focusY, buttonColor },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  return (
    // The navbar is h-14 (3.5rem) and stays above this. The animation uses the rest of the screen.
    <div className="h-[calc(100dvh-3.5rem)]">
      <section
        ref={sectionRef}
        className="dark relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        <GatewayFlow
          mode="dark"
          hole={focus.hole}
          focusY={focus.focusY}
          buttonColor={focus.buttonColor}
          className="absolute inset-0 size-full"
          speed={0.3}
        />
        {/*
          Navbar is 3.5rem (h-14) and this section starts under it.
          --read-button-h matches the link below. The text block grows until
          its bottom edge is half a button above the screen's vertical middle,
          so the button lands on that middle. pt-6 only matters on a short
          window, where it keeps the title off the navbar. The empty flex child
          keeps the rest of the section from stretching the text block.
        */}
        <div className="relative z-10 flex h-full w-full flex-col items-center [--read-button-h:2.75rem]">
          <div className="flex w-full max-w-3xl min-h-[calc(50dvh-3.5rem-var(--read-button-h)/2)] flex-col items-center justify-end gap-5 px-8 pt-6 pb-5 text-center">
            <img
              src="/banner.svg"
              alt="Tiramisu banner"
              width={2048}
              height={392}
              className="h-[40px] w-auto max-w-full"
            />
            <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl lg:text-6xl text-balance">
              Git-native memory for AI coding agents.
            </h1>
            <p className="text-lg leading-relaxed text-white max-w-xl">
              Tiramisu helps your agent access project, personal, team, and organization memories at
              the same time.
            </p>
          </div>
          <Link
            ref={buttonRef}
            href={docsRoute}
            className="flex h-(--read-button-h) w-fit shrink-0 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Read the docs
          </Link>
          <div className="min-h-0 w-full flex-1" aria-hidden />
        </div>
      </section>
    </div>
  );
}
