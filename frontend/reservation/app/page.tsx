// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div>
      <Header />
      <main className="flex flex-col items-center text-center gap-6 py-10">
        <Avatar className="h-45 w-45">
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <h2 className="">خط کج باربرشاپ</h2>
        <h2 className="">Khatte kaj Barbershop</h2>
        {/* slider */}
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
