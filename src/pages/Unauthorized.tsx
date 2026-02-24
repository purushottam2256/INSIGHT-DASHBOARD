import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="bg-destructive/10 p-4 rounded-full mb-6">
        <ShieldAlert className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        You do not have permission to view this page. This dashboard is restricted to HODs, Management, Principals, and Developers only.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button onClick={() => navigate("/login")}>
          Back to Login
        </Button>
      </div>
    </div>
  );
}
