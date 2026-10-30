import ReserveButton from "@/components/home/ReserveButton";

// Mobile-only bottom bar so the primary action is always reachable.
const StickyCta = () => (
  <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t bg-background/90 p-3 backdrop-blur sm:hidden">
    <ReserveButton />
  </div>
);

export default StickyCta;
