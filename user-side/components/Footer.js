import Image from "next/image";

export default function Footer() {
  return (
    <footer className="py-4 px-4 text-center border-t border-[--border] bg-[--bg]">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-[--text-muted]">Powered by</span>
        <Image 
          src="/assets/logos/orderzap-logo.png" 
          alt="OrderZap" 
          width={100} 
          height={30}
          className="object-contain"
        />
      </div>
      <p className="text-xs text-[--text-muted] mt-1">How Patna Order's</p>
    </footer>
  );
}
