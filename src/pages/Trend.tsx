import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Trend = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3 flex items-center border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="ml-3 text-lg font-semibold text-foreground">Trend</h1>
      </div>
      <div className="p-4">
        <p className="text-muted-foreground">Trend page content goes here.</p>
      </div>
    </div>
  );
};

export default Trend;
