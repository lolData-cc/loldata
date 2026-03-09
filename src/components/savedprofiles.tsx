import { Star } from "lucide-react";

type SavedProfilesProps = {
  onClick?: () => void;
};

export function SavedProfiles({ onClick }: SavedProfilesProps) {
  return (
    <div
      onClick={onClick}
      className="bg-jade/10 p-1 rounded-sm cursor-clicker hover:bg-jade/20"
    >
      <Star className="h-4 w-4 text-jade" />
    </div>
  );
}