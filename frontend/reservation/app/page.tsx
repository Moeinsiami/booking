// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ShowCase from "@/components/home/ShowCase";
import ImageSlider from "@/components/home/ImageSlider";

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Header />
      <main className="flex flex-col items-center text-center gap-6 py-10">
        <ShowCase />
        <ImageSlider />
        <h3 className="">دربافت نوبت</h3>
        <Button>دریافت نوبت</Button>
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
