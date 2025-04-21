import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";

interface GoogleSignInButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function GoogleSignInButton({ children, ...props }: GoogleSignInButtonProps) {
  return (
    <Button
      variant="outline"
      type="button"
      className="w-full bg-white text-black border border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-2"
      {...props}
    >
      <FcGoogle className="h-5 w-5" />
      {children}
    </Button>
  );
}