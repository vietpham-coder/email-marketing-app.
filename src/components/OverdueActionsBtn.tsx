"use client";

import { PlaySquare } from "lucide-react";

export default function OverdueActionsBtn() {
  return (
    <button 
      className="btn-primary" 
      onClick={() => alert("Simulation: Redirecting to actionable follow-ups")}
    >
      <PlaySquare size={18} />
      View Overdue Actions
    </button>
  );
}
