import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Context para comunicação entre List e Triggers
const TabsListContext = React.createContext<{
  triggerRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  updateSliderPosition: (value: string) => void;
} | null>(null);

const TabsWithSlider = TabsPrimitive.Root;

interface TabsListWithSliderProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {}

const TabsListWithSlider = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListWithSliderProps
>(({ className, children, ...props }, ref) => {
  const [sliderPos, setSliderPos] = React.useState({ x: 0, width: 0 });
  const [sliderVisible, setSliderVisible] = React.useState(false);
  const tabsListRef = React.useRef<HTMLDivElement>(null);
  const triggerRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const updateSliderPosition = React.useCallback((activeValue: string) => {
    const container = tabsListRef.current;
    const target = triggerRefs.current[activeValue];
    
    if (!container || !target) {
      setSliderVisible(false);
      return;
    }
    
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    
    setSliderPos({
      x: targetRect.left - containerRect.left,
      width: targetRect.width,
    });
    setSliderVisible(true);
  }, []);

  // Observe resize to reposition slider
  React.useEffect(() => {
    const container = tabsListRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const activeTab = container.querySelector('[data-state="active"]') as HTMLButtonElement;
      if (activeTab) {
        const val = activeTab.getAttribute('data-value');
        if (val) updateSliderPosition(val);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateSliderPosition]);

  // Also observe mutations (data-state changes) to catch tab switches
  React.useEffect(() => {
    const container = tabsListRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      const activeTab = container.querySelector('[data-state="active"]') as HTMLButtonElement;
      if (activeTab) {
        const val = activeTab.getAttribute('data-value');
        if (val) updateSliderPosition(val);
      }
    });
    observer.observe(container, { attributes: true, attributeFilter: ['data-state'], subtree: true });
    return () => observer.disconnect();
  }, [updateSliderPosition]);

  const contextValue = React.useMemo(
    () => ({ triggerRefs, updateSliderPosition }),
    [updateSliderPosition]
  );

  return (
    <TabsListContext.Provider value={contextValue}>
      <TabsPrimitive.List
        ref={(node) => {
          tabsListRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 p-1",
          className
        )}
        {...props}
      >
        {sliderVisible && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: 0,
              left: 0,
              height: '100%',
              background: 'hsl(0 0% 100% / 0.10)',
              boxShadow: `
                0 4px 12px rgba(0,0,0,0.12),
                0 1px 2px rgba(0,0,0,0.06),
                inset 0 1px 0 rgba(255,255,255,0.20)
              `,
            }}
            initial={false}
            animate={{ x: sliderPos.x, width: sliderPos.width }}
            transition={{ type: "spring", stiffness: 340, damping: 28, mass: 0.8 }}
          />
        )}
        {children}
      </TabsPrimitive.List>
    </TabsListContext.Provider>
  );
});
TabsListWithSlider.displayName = "TabsListWithSlider";

const TabsTriggerWithSlider = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(TabsListContext);

  // Initial position for default active tab
  React.useEffect(() => {
    const trigger = context?.triggerRefs.current[value as string];
    if (trigger?.getAttribute('data-state') === 'active') {
      context?.updateSliderPosition(value as string);
    }
  }, []);

  return (
    <TabsPrimitive.Trigger
      ref={(node) => {
        if (context && value) {
          context.triggerRefs.current[value as string] = node;
        }
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      value={value}
      data-value={value}
      className={cn(
        "relative z-10 px-8 py-3 rounded-full text-sm font-medium transition-colors",
        "text-white/70 hover:text-white",
        "data-[state=active]:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
});
TabsTriggerWithSlider.displayName = "TabsTriggerWithSlider";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { TabsWithSlider, TabsListWithSlider, TabsTriggerWithSlider, TabsContent };
