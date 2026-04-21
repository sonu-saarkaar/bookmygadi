import React from "react";
import { LiveRadiusMap } from "@/components/map/LiveRadiusMap";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RadarPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-screen bg-gray-50 flex flex-col">
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => navigate(-1)}
          className="bg-white p-3 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
      </div>
      
      <LiveRadiusMap />
    </div>
  );
};

export default RadarPage;
