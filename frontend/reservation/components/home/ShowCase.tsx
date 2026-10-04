import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ShowCase = () => {
  return (
    <div className="">
      <Avatar className="h-45 w-45">
        <AvatarImage src="images/logo/logo.jpeg" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <div className="mt-5">
        <h2 className="text-lg font-bold">خط کج باربرشاپ</h2>
        <h2 className="">Khatte kaj Barbershop</h2>
      </div>
    </div>
  );
};

export default ShowCase;
