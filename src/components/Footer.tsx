import { Link } from "react-router-dom";

const Footer = () => {
  const timelessLinks = [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Pricing", href: "/pricing" },
    { label: "Apps", href: "#" },
    { label: "Cinema Studio", href: "/create?type=cinema" },
    { label: "Community", href: "#" },
    { label: "Enterprise", href: "#" },
    { label: "Team", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Discord", href: "#" },
  ];

  const imageLinks = [
    { label: "Create Image", href: "/create?type=image" },
    { label: "Draw to Edit", href: "/create?type=image&app=inpainting" },
    { label: "Image Upscale", href: "/create?type=image&app=upscale" },
    { label: "Background Remove", href: "/create?type=image&app=background-remove" },
    { label: "Colorize", href: "/create?type=image&app=colorize" },
    { label: "Relight", href: "/create?type=image&app=relight" },
    { label: "Style Transfer", href: "/create?type=image&app=style-transfer" },
    { label: "Inpaint", href: "/create?type=image&app=inpainting" },
  ];

  const videoLinks = [
    { label: "Create Video", href: "/create?type=video" },
    { label: "Lipsync Studio", href: "/create?type=video&app=lipsync" },
    { label: "Draw to Video", href: "/create?type=video&app=draw-to-video" },
    { label: "UGC Factory", href: "/create?type=video&app=ugc-factory" },
    { label: "Video Upscale", href: "/create?type=video&app=video-upscale" },
    { label: "Extend Video", href: "/create?type=video&app=extend" },
    { label: "Interpolate", href: "/create?type=video&app=interpolate" },
    { label: "Stabilize", href: "/create?type=video&app=stabilize" },
  ];

  const musicLinks = [
    { label: "Create Music", href: "/create?type=music" },
    { label: "Remix", href: "/create?type=music&app=remix" },
    { label: "Stems", href: "/create?type=music&app=stems" },
    { label: "Mastering", href: "/create?type=music&app=mastering" },
    { label: "Audio Enhance", href: "/create?type=music&app=audio-enhance" },
    { label: "Sound Effects", href: "/create?type=music&app=sound-effects" },
  ];

  const socialLinks = [
    { label: "X / Twitter", href: "https://twitter.com/timaborowiec" },
    { label: "Youtube", href: "https://youtube.com/@timelessai" },
    { label: "Instagram", href: "https://instagram.com/timelessai" },
    { label: "LinkedIn", href: "https://linkedin.com/company/timelessai" },
    { label: "TikTok", href: "https://tiktok.com/@timelessai" },
    { label: "Discord", href: "https://discord.gg/lovable-dev" },
  ];

  return (
    <footer className="bg-primary text-primary-foreground py-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Tagline */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl md:text-3xl font-bold italic leading-tight">
              THE ULTIMATE AI-POWERED CREATIVE STUDIO FOR FILMMAKERS & CREATORS
            </h2>
          </div>

          {/* Timeless Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 opacity-70">Timeless</h3>
            <ul className="space-y-2">
              {timelessLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm hover:opacity-70 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Image Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 opacity-70">Image</h3>
            <ul className="space-y-2">
              {imageLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm hover:opacity-70 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Video Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 opacity-70">Video</h3>
            <ul className="space-y-2">
              {videoLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm hover:opacity-70 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Music Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 opacity-70">Music</h3>
            <ul className="space-y-2">
              {musicLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm hover:opacity-70 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs opacity-70">
            <p>© {new Date().getFullYear()} Timeless AI. All rights reserved.</p>
            <p className="mt-1">San Francisco, CA</p>
          </div>
          <div className="flex gap-6">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs hover:opacity-70 transition-opacity"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
