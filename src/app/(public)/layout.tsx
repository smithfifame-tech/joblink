import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { BackToTop } from "@/components/layout/back-to-top";
import { AnnouncementBar } from "@/components/layout/announcement-bar";

/** Pages publiques : cachables (ISR). L'état de connexion de l'en-tête est détecté côté navigateur. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(58px+env(safe-area-inset-bottom,0px))] lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <BackToTop />
      <MobileTabBar />
    </div>
  );
}
