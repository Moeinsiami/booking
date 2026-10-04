import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ReservationPage() {
  return (
    <div className="overflow-x-hidden">
      <Header />
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">رزرو نوبت</h1>
      </main>
      <Footer />
    </div>
  );
}
