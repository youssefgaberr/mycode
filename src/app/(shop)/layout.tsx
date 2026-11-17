import { BasketProvider } from "@/components/basket/BasketProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TestModeBanner } from "@/components/layout/TestModeBanner";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <BasketProvider>
      <TestModeBanner />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </BasketProvider>
  );
}
