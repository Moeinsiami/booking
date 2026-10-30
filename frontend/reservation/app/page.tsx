import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShowCase from "@/components/home/ShowCase";
import Services from "@/components/home/Services";
import ImageSlider from "@/components/home/ImageSlider";
import Info from "@/components/home/Info";
import StickyCta from "@/components/home/StickyCta";

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Header />
      <main className="flex flex-col items-center gap-10 py-6 sm:gap-14">
        <ShowCase />
        <Services />
        <ImageSlider />
        <Info />
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
