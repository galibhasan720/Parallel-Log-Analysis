import {
  Children,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAppData } from "../context/AppDataContext";

const StaggerContext = createContext(0);

export function usePrefersMotion(): boolean {
  try {
    const { preferences } = useAppData();
    return preferences.motion;
  } catch {
    if (typeof document !== "undefined") {
      return document.documentElement.dataset.motion !== "off";
    }
    return true;
  }
}

export function MotionRoot({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`motion-root ${className}`.trim()}>{children}</div>;
}

export function Stagger({
  className = "",
  step = 70,
  children,
}: {
  className?: string;
  step?: number;
  children: ReactNode;
}) {
  return (
    <div className={`stagger ${className}`.trim()} style={{ ["--stagger-step" as string]: `${step}ms` }}>
      {Children.map(children, (child, index) => (
        <StaggerContext.Provider value={index} key={index}>
          <div className="stagger-item" style={{ ["--d" as string]: `${index * step}ms` }}>
            {child}
          </div>
        </StaggerContext.Provider>
      ))}
    </div>
  );
}

export function Reveal({
  className = "",
  delay,
  variant = "up",
  children,
}: {
  className?: string;
  delay?: number;
  variant?: "up" | "scale" | "left" | "right";
  children: ReactNode;
}) {
  const staggerIndex = useContext(StaggerContext);
  const resolvedDelay = delay ?? staggerIndex * 70;
  return (
    <div
      className={`reveal reveal-${variant} ${className}`.trim()}
      style={{ ["--d" as string]: `${resolvedDelay}ms` }}
    >
      {children}
    </div>
  );
}

export function useInViewReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const motion = usePrefersMotion();
  const [visible, setVisible] = useState(!motion);

  useEffect(() => {
    if (!motion) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [motion, threshold]);

  return { ref, visible, className: visible ? "in-view" : "await-view" };
}

export function CountUp({
  value,
  duration = 1100,
  decimals = 0,
  suffix = "",
  prefix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}) {
  const motion = usePrefersMotion();
  const [display, setDisplay] = useState(motion ? 0 : value);

  useEffect(() => {
    if (!motion) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, motion]);

  return (
    <span className="count-up">
      {prefix}
      {display.toLocaleString(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
