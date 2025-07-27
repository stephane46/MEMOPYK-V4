import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">DEBUG: Route Issue Detected</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Current route: <code className="bg-gray-200 px-1 rounded">{location}</code>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            This component should not appear on the homepage. If you see this after FAQ, there's a routing conflict.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
