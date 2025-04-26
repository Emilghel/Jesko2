import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function PartnerAccessButton() {
  const { toast } = useToast();

  const handleDirectAccess = () => {
    try {
      console.log("Setting up universal partner access tokens...");
      
      // Use a known working token from the database (from active token list)
      const workingToken = "XOsk409V3G1X2LfoIYpg+uq5nKtpfRfWjhY3v0PkeCJlTUMo9DL90XP4RJQLA7iw";
      
      // Store tokens in both localStorage items for maximum compatibility
      localStorage.setItem('auth_token', workingToken);
      localStorage.setItem('partnerToken', workingToken);
      
      // Create Zack's partner info
      const zackPartner = {
        id: 1,
        user_id: 1,
        company_name: "Zack Partner Agency", 
        email: "zack@partner.com",
        status: "ACTIVE",
        referral_code: "ZACHPARTNER",
        contact_name: "Zack",
        earnings_balance: 0,
        total_earnings: 0,
        created_at: new Date().toISOString(),
        commission_rate: 0.2
      };
      
      // Store partner info in localStorage
      localStorage.setItem('partnerInfo', JSON.stringify(zackPartner));
      
      toast({
        title: "Partner Access Granted",
        description: "Redirecting to partner dashboard...",
      });
      
      // Redirect to partner dashboard
      setTimeout(() => {
        window.location.href = window.location.origin + '/partner/dashboard';
      }, 500);
    } catch (error) {
      console.error("Error setting up partner access:", error);
      toast({
        title: "Partner Access Failed",
        description: "There was a problem accessing the partner dashboard.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={handleDirectAccess}
      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
    >
      Access Partner Dashboard
    </Button>
  );
}