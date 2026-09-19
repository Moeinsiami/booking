// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div>
      <Header />
      <main>
        <h1 className="text-3xl underline">Hello world!</h1>
      </main>
      <Footer />
    </div>
  );
}
