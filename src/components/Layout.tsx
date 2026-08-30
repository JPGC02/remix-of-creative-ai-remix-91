import { ReactNode } from "react";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
  backgroundClass?: string;
}

export const Layout = ({ children, backgroundClass = "bg-background" }: LayoutProps) => {
  return (
    <div className={`min-h-screen ${backgroundClass}`}>
      <Header />
      <div className="flex">
        <main className="flex-1 transition-all duration-300 relative z-0 pt-24 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
