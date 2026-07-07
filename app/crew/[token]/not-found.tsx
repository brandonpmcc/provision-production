export default function CrewNotFound() {
  return (
    <div className="min-h-screen bg-provision-navy flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <div className="text-6xl">🔒</div>
        <div className="font-display font-black text-white text-2xl uppercase tracking-wide">
          Invalid Portal Link
        </div>
        <p className="text-white/50 text-sm max-w-xs">
          This crew portal link is invalid or has expired. Contact Miriam for your correct portal link.
        </p>
        <div className="text-[11px] text-white/20 pt-4">Pro-Vision Painting</div>
      </div>
    </div>
  );
}
