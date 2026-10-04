// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShowCase from "@/components/home/ShowCase";
import ImageSlider from "@/components/home/ImageSlider";
import ReserveButton from "@/components/home/ReserveButton";

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Header />
      <main className="flex flex-col items-center text-center gap-6 py-10">
        <ShowCase />
        <ImageSlider />
        <ReserveButton />
        <h3 className="">نظر مشتریان </h3>
        {/* slider */}
        <div>
          <h3 className="">درباره ما</h3>
          <p>دارای سابقه 10 ساله در ارایشگری در کشور های مختلف</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
